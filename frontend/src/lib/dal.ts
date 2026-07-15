import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { decrypt, SESSION_COOKIE_NAME } from '@/lib/session'
import type {
  AdminDashboardStats,
  AdminUserListItem,
  AdminUserListResponse,
} from '@/lib/api/adminApi'

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

async function getSessionPayload() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value
  return decrypt(sessionCookie)
}

/**
 * Read-only session lookup. Returns null when not authenticated so Server
 * Components can branch without throwing. Cached per-request via React.cache.
 */
export const getSession = cache(async () => {
  const payload = await getSessionPayload()
  if (!payload?.userId) return null
  return {
    userId: payload.userId,
    role: payload.role,
    accessToken: payload.accessToken,
  }
})

/**
 * Verify the current user has a session. Redirects to /login if not.
 * Cached for the duration of a single request via React.cache.
 */
export const verifySession = cache(async () => {
  const payload = await getSessionPayload()

  if (!payload?.userId) {
    redirect('/login')
  }

  return {
    isAuth: true,
    userId: payload.userId,
    role: payload.role,
    accessToken: payload.accessToken,
  }
})

/**
 * Verify the current user is an admin. Redirects to /login if not authed,
 * throws if authed but not admin. Cached per-request.
 */
export const verifyAdmin = cache(async () => {
  const session = await verifySession()
  if (session.role !== 'admin') {
    redirect('/dashboard')
  }
  return session
})

/**
 * Server-side fetch helper that forwards the session's access token
 * to the Go backend. Only callable from server components / RSC.
 */
async function serverFetch<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    // Don't cache at the fetch level — we layer cache() / unstable_cache above
    cache: 'no-store',
  })

  if (!res.ok) {
    let message = `Backend ${path} failed: ${res.status}`
    try {
      const body = await res.json()
      if (body?.message) message = body.message
    } catch {
      // ignore parse error
    }
    throw new Error(message)
  }

  if (res.status === 204) return {} as T
  return res.json() as Promise<T>
}

// -------- Admin data access (server-side, cached) --------

export interface GetAdminUsersParams {
  role?: string
  search?: string
  limit?: number
  offset?: number
}

/**
 * Fetch admin dashboard stats. Dedupe within a single render via React.cache.
 * For cross-request LRU, use getAdminStatsCached instead.
 */
export const getAdminStats = cache(async (): Promise<AdminDashboardStats> => {
  const session = await verifyAdmin()
  return serverFetch<AdminDashboardStats>('/admin/stats', session.accessToken)
})

/**
 * Fetch admin users list with server-side filtering.
 * Cached per-request (same params dedupe within a render).
 */
export const getAdminUsers = cache(
  async (params: GetAdminUsersParams = {}): Promise<AdminUserListResponse> => {
    const session = await verifyAdmin()
    const search = new URLSearchParams()
    if (params.role && params.role !== 'all') search.append('role', params.role)
    if (params.search) search.append('search', params.search)
    if (params.limit) search.append('limit', String(params.limit))
    if (params.offset) search.append('offset', String(params.offset))
    const qs = search.toString()
    return serverFetch<AdminUserListResponse>(
      `/admin/users${qs ? `?${qs}` : ''}`,
      session.accessToken,
    )
  },
)

/**
 * Fetch single user detail. Cached per-request.
 */
export const getAdminUserDetail = cache(
  async (userId: string): Promise<AdminUserListItem> => {
    const session = await verifyAdmin()
    return serverFetch<AdminUserListItem>(
      `/admin/users/${userId}`,
      session.accessToken,
    )
  },
)

/**
 * Cross-request LRU cache for dashboard stats.
 * Refreshes every 60s and is tagged so password changes (and other
 * mutations) can bust the cache via revalidateTag('admin-stats').
 */
export const getAdminStatsCached = unstable_cache(
  async (): Promise<AdminDashboardStats> => {
    const session = await verifyAdmin()
    return serverFetch<AdminDashboardStats>(
      '/admin/stats',
      session.accessToken,
    )
  },
  ['admin-stats'],
  { revalidate: 60, tags: ['admin-stats'] },
)

/**
 * Server-side fetch for the latest body measurement.
 * Cross-request cached for 30 s; tagged for mutation invalidation.
 */
export const getLatestBodyMeasurementCached = unstable_cache(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (): Promise<any> => {
    const session = await verifySession()
    const result = await serverFetch<Record<string, unknown> | null>(
      '/measurements/latest',
      session.accessToken,
    )
    // serverFetch returns {} for 204 No Content responses; treat empty as null
    if (result && Object.keys(result).length === 0) return null
    return result
  },
  ['latest-body-measurement'],
  { revalidate: 30, tags: ['body-measurements', 'latest-body-measurement'] },
)

/**
 * Server-side fetch for the current trainer's profile.
 * Cross-request cached for 5 min; tagged for mutation invalidation.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getTrainerProfileCached = unstable_cache(
  async (): Promise<any> => {
    const session = await verifySession()
    return serverFetch<Record<string, unknown>>(
      '/trainer-catalog/my-profile',
      session.accessToken,
    )
  },
  ['trainer-profile'],
  { revalidate: 300, tags: ['trainer-profile'] },
)

/**
 * Server-side fetch for a single workout plan by ID.
 * Cross-request cached for 60 s; tagged for mutation invalidation.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getWorkoutPlanCached = unstable_cache(
  async (planId: string): Promise<any> => {
    const session = await verifySession()
    return serverFetch<Record<string, unknown>>(
      `/workout-plans/${planId}`,
      session.accessToken,
    )
  },
  ['workout-plan'],
  { revalidate: 60, tags: ['workout-plans'] },
)

/**
 * Server-side fetch for a workout plan's athlete assignments.
 * Cross-request cached for 60 s; tagged for mutation invalidation.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getWorkoutPlanAssignmentsCached = unstable_cache(
  async (planId: string): Promise<any> => {
    const session = await verifySession()
    return serverFetch<Record<string, unknown>>(
      `/workout-plans/${planId}/assignments`,
      session.accessToken,
    )
  },
  ['workout-plan-assignments'],
  { revalidate: 60, tags: ['workout-plans'] },
)
