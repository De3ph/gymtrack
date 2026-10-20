import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cacheLife, cacheTag } from 'next/cache'
import { decrypt, SESSION_COOKIE_NAME, REFRESH_COOKIE_NAME } from '@/lib/session'
import { INTERNAL_API_URL } from '@/lib/server-env'
import type {
  AdminDashboardStats,
  AdminUserListItem,
  AdminUserListResponse,
} from '@/lib/api/adminApi'
import type {
  BodyMeasurement,
  CurrentUser,
  Equipment,
  ExerciseLibrary,
  MuscleGroup,
  TrainerProfile,
  WorkoutPlan,
  AssignmentListResponse,
} from '@/types'

// Server-side fetch needs an absolute URL; the public API_URL may be the
// same-origin relative "/api" (browser-only). See INTERNAL_API_URL in server-env.ts.
const BACKEND_URL = INTERNAL_API_URL

/**
 * Refresh slightly before the real expiry so a token cannot expire midway
 * between this check and the backend request that uses it.
 */
const TOKEN_REFRESH_SKEW_MS = 60_000

/**
 * Server fetch policy: one retry on transient network/5xx blips, per-attempt
 * timeout so a hung backend cannot hang rendering forever.
 */
const SERVER_FETCH_TIMEOUT_MS = 5000
const SERVER_FETCH_RETRIES = 1

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Backend ${url} timed out after ${timeoutMs}ms`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

function isRetriableFetchError(error: unknown): boolean {
  if (error instanceof Error) {
    // Network failure, timeout, or connection reset — worth one retry.
    if (error.message.includes("timed out")) return true
    if (error instanceof TypeError) return true
  }
  return false
}

/**
 * Reads a JWT's `exp` claim without verifying the signature.
 *
 * This is only a liveness check to decide whether a refresh is worth
 * attempting — the Go backend remains the sole authority on whether a token
 * is actually valid. Returns null when the claim is absent or unparseable,
 * which the caller treats as "refresh to be safe".
 */
function jwtExpiresAt(token: string): number | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const claims = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8'),
    ) as { exp?: unknown }
    return typeof claims.exp === 'number' ? claims.exp * 1000 : null
  } catch {
    return null
  }
}

/**
 * Exchanges the long-lived refresh token for a fresh access token.
 *
 * The backend issues no rotated refresh token (`POST /auth/refresh` returns
 * only `accessToken`) and refresh tokens are stateless, so the same cookie
 * can be redeemed repeatedly for the life of the session. That is what makes
 * it safe to refresh here without persisting the new access token back into
 * the session cookie — Server Components are not allowed to write cookies,
 * and there is nothing to write back.
 */
async function refreshAccessToken(
  refreshToken: string,
): Promise<string | null> {
  try {
    // Auth-scoped: never cached, single retry on transient network blips.
    for (let attempt = 0; attempt <= SERVER_FETCH_RETRIES; attempt++) {
      try {
        const res = await fetchWithTimeout(
          `${BACKEND_URL}/auth/refresh`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
            cache: 'no-store',
          },
          SERVER_FETCH_TIMEOUT_MS,
        )
        if (!res.ok) return null
        const data = (await res.json()) as { accessToken?: string }
        return data.accessToken ?? null
      } catch (error) {
        if (attempt >= SERVER_FETCH_RETRIES || !isRetriableFetchError(error)) {
          return null
        }
      }
    }
    return null
  } catch {
    return null
  }
}

const getSessionPayload = cache(async () => {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value
  return decrypt(sessionCookie)
})

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
 *
 * The access token embedded in the session cookie is the one minted at login
 * and is never rewritten (the client refreshes its own copy in memory but
 * never syncs the cookie back). Since access tokens live for 1 hour while the
 * session envelope lasts 7 days, the embedded token goes stale for every
 * server-side fetch made more than an hour after login — surfacing as a 401
 * from the backend on pages like /athlete/workouts?planId=…
 *
 * So the token is transparently renewed from the refresh-token cookie before
 * being handed out. Without this, every cached DAL getter fails permanently
 * once the login-time token expires, even though the client keeps working.
 */
export const verifySession = cache(async () => {
  const payload = await getSessionPayload()

  if (!payload?.userId) {
    redirect('/login')
  }

  let { accessToken } = payload

  const expiresAt = jwtExpiresAt(accessToken)
  if (expiresAt === null || expiresAt - Date.now() <= TOKEN_REFRESH_SKEW_MS) {
    const refreshToken = (await cookies()).get(REFRESH_COOKIE_NAME)?.value
    const refreshed = refreshToken ? await refreshAccessToken(refreshToken) : null

    // A dead refresh token means the session is genuinely over.
    if (!refreshed) {
      // The reason travels with the redirect so the login page can explain
      // why the user is back there instead of showing a bare login form.
      redirect('/login?reason=session_expired')
    }
    accessToken = refreshed
  }

  return {
    isAuth: true,
    userId: payload.userId,
    role: payload.role,
    accessToken,
  }
})

/**
 * Authoritative current-user lookup for Server Components. Reads the session
 * cookie (redirecting to /login when absent) and fetches the profile from the
 * Go backend once per request. The dashboard layout passes the result down so
 * the client does not have to re-fetch /users/me after hydration.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const session = await verifySession()
  return serverFetch<CurrentUser>('/users/me', session.accessToken)
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
 *
 * Retries once on network failure / 5xx (transient blips), with a per-attempt
 * timeout so a hung backend cannot hang rendering forever. `cache: 'no-store'`
 * keeps auth-scoped reads fresh — cross-request caching is layered explicitly
 * above via 'use cache' on reference data only (exercises, muscle-groups,
 * equipment).
 */
async function serverFetch<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const headers = {
    ...(init?.headers as Record<string, string> | undefined),
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
  let lastError: unknown = null
  for (let attempt = 0; attempt <= SERVER_FETCH_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(
        `${BACKEND_URL}${path}`,
        {
          ...init,
          headers,
          // Don't cache at the fetch level — we layer cache() / unstable_cache above
          cache: 'no-store',
        },
        SERVER_FETCH_TIMEOUT_MS,
      )

      // One retry on transient 5xx (excluding the final attempt).
      if (res.status >= 500 && attempt < SERVER_FETCH_RETRIES) {
        lastError = new Error(`Backend ${path} failed: ${res.status}`)
        continue
      }

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

      // A 204 carries no body. Returning `{}` here would fabricate an empty object
      // that callers type as their real response model, so an absent resource
      // silently arrives looking valid with every field undefined. Return `null`
      // instead and let callers narrow. (GET /measurements/latest is currently the
      // only 204 in the API; see getLatestBodyMeasurementCached below.)
      if (res.status === 204) return null as T
      return res.json() as Promise<T>
    } catch (error) {
      lastError = error
      // Only retry network/timeout faults; HTTP 4xx and parsed errors throw above.
      if (attempt >= SERVER_FETCH_RETRIES || !isRetriableFetchError(error)) {
        throw error
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Backend ${path} failed`)
}

/**
 * Like serverFetch, but a 404 resolves to null instead of throwing.
 *
 * The exercise detail route renders a real "not found" state for an id that no
 * longer exists, and it cannot know that id up front — the id comes from the URL.
 * serverFetch would turn that expected outcome into a thrown Error, forcing the
 * page to either swallow real backend faults along with it or render an error
 * box where a 404 message belongs.
 */
async function serverFetchNullable<T>(
  path: string,
  accessToken: string,
): Promise<T | null> {
  let lastError: unknown = null
  for (let attempt = 0; attempt <= SERVER_FETCH_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(
        `${BACKEND_URL}${path}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        },
        SERVER_FETCH_TIMEOUT_MS,
      )

      if (res.status === 404) return null

      if (res.status >= 500 && attempt < SERVER_FETCH_RETRIES) {
        lastError = new Error(`Backend ${path} failed: ${res.status}`)
        continue
      }

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

      if (res.status === 204) return null
      return res.json() as Promise<T>
    } catch (error) {
      // A 404-as-null is returned above, never thrown — anything caught here is
      // a genuine fault. Retry network/timeout blips once.
      lastError = error
      if (attempt >= SERVER_FETCH_RETRIES || !isRetriableFetchError(error)) {
        throw error
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Backend ${path} failed`)
}

// -------- Admin data access (server-side, cached) --------

export interface GetAdminUsersParams {
  role?: string
  search?: string
  limit?: number
  offset?: number
}

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
 * Cross-request cache for dashboard stats.
 * Refreshes every 60s and is tagged so mutations can bust via revalidateTag('admin-stats').
 * Session read happens outside the cache scope — accessToken passed as arg.
 */
export async function getAdminStatsCached(accessToken: string): Promise<AdminDashboardStats> {
  'use cache'
  cacheLife('minutes')
  cacheTag('admin-stats')
  return serverFetch<AdminDashboardStats>(
    '/admin/stats',
    accessToken,
  )
}

/**
 * Server-side fetch for the latest body measurement.
 * Cross-request cached for 30s; tagged for mutation invalidation.
 * Session read outside cache scope — accessToken + userId passed as args
 * to prevent cross-user cache leaks.
 */
export async function getLatestBodyMeasurementCached(
  accessToken: string,
  _userId: string,
): Promise<BodyMeasurement | null> {
  'use cache'
  cacheLife({ revalidate: 30, expire: 60 })
  cacheTag('body-measurements', 'latest-body-measurement')
  // serverFetch maps 204 to null, so the empty-history case arrives as null
  // directly rather than needing an empty-object sniff here.
  return await serverFetch<BodyMeasurement | null>(
    '/measurements/latest',
    accessToken,
  )
}

/**
 * Server-side fetch for the current trainer's profile.
 * Cross-request cached for 5 min; tagged for mutation invalidation.
 * Session read outside cache scope — accessToken + userId passed as args
 * to prevent cross-user cache leaks.
 */
export async function getTrainerProfileCached(
  accessToken: string,
  _userId: string,
): Promise<TrainerProfile> {
  'use cache'
  cacheLife({ revalidate: 300, expire: 3600 })
  cacheTag('trainer-profile')
  const result = await serverFetch<Record<string, unknown>>(
    '/trainers/me/profile',
    accessToken,
  )
  return result as unknown as TrainerProfile
}

/**
 * Server-side fetch for a single workout plan by ID.
 * Cross-request cached for 60s; tagged for mutation invalidation.
 * Session read outside cache scope — accessToken passed as arg.
 */
export async function getWorkoutPlanCached(
  accessToken: string,
  planId: string,
): Promise<WorkoutPlan> {
  'use cache'
  cacheLife('minutes')
  cacheTag('workout-plans')
  const result = await serverFetch<Record<string, unknown>>(
    `/workout-plans/${planId}`,
    accessToken,
  )
  return result as unknown as WorkoutPlan
}

/**
 * Server-side fetch for a workout plan's athlete assignments.
 * Cross-request cached for 60s; tagged for mutation invalidation.
 * Session read outside cache scope — accessToken passed as arg.
 */
export async function getWorkoutPlanAssignmentsCached(
  accessToken: string,
  planId: string,
): Promise<AssignmentListResponse> {
  'use cache'
  cacheLife('minutes')
  cacheTag('workout-plans')
  const result = await serverFetch<Record<string, unknown>>(
    `/workout-plans/${planId}/assignments`,
    accessToken,
  )
  return result as unknown as AssignmentListResponse
}

// --- Exercise library ---
//
// The catalog is identical for every user, so these reads are not session
// scoped. The access token is still passed in rather than read inside the cache
// scope: reading cookies() under 'use cache' would either throw or widen the
// cache key to the session, which is the opposite of what we want for
// reference data. These endpoints are public on the backend, so the token is
// only used to keep the request shape identical to every other serverFetch.

/** Whole exercise catalog, ordered by name. */
export async function getExercisesCatalogCached(
  accessToken: string,
): Promise<ExerciseLibrary[]> {
  'use cache'
  cacheLife({ revalidate: 3600, expire: 86400 })
  cacheTag('exercises')
  return serverFetch<ExerciseLibrary[]>('/exercises', accessToken)
}

/**
 * Sentinel `name` for the not-found signal raised inside the cached lookup.
 *
 * A module-level class plus `instanceof` does NOT work here: the `'use cache'`
 * scope is compiled into its own module graph, so the thrown error can arrive
 * reconstructed rather than as the very class thrown. `instanceof` then fails,
 * the miss escapes as a generic fault, and a genuinely missing exercise renders
 * a "check your connection" error instead of a 404. The discriminator therefore
 * has to be structural — `name` survives that boundary.
 */
const EXERCISE_NOT_FOUND = 'ExerciseNotFoundError';

function isExerciseNotFound(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { name?: unknown }).name === EXERCISE_NOT_FOUND
  );
}

/**
 * Cached exercise lookup. Only ever stores a hit.
 *
 * A miss throws instead of returning null. That is deliberate: with `'use cache'`
 * a returned null is persisted with the full `revalidate` window, so one
 * transient 404 — backend restarting, a deploy in progress, a blip at the proxy
 * — would be replayed as a hard "exercise does not exist" 404 for the next hour,
 * even after the backend recovered. Nothing about a 404 is a durable fact worth
 * an hour of caching, and a stale 404 is indistinguishable from a real one to
 * the user.
 *
 * Not caching a miss costs one extra backend call per visit to an exercise that
 * genuinely does not exist. That is the correct trade against serving a wrong
 * 404 to every visitor for an hour.
 */
async function fetchExerciseCached(
  accessToken: string,
  exerciseId: string,
): Promise<ExerciseLibrary> {
  'use cache'
  cacheLife({ revalidate: 3600, expire: 86400 })
  cacheTag('exercises', `exercise:${exerciseId}`)
  const exercise = await serverFetchNullable<ExerciseLibrary>(
    `/exercises/${exerciseId}`,
    accessToken,
  )
  if (!exercise) {
    const err = new Error(`exercise ${exerciseId} not found`)
    err.name = EXERCISE_NOT_FOUND
    throw err
  }
  return exercise
}

/** One exercise by ID. Returns null when the backend answers 404. */
export async function getExerciseByIdCached(
  accessToken: string,
  exerciseId: string,
): Promise<ExerciseLibrary | null> {
  // The try/catch lives *outside* the `'use cache'` scope. Catching inside it
  // would convert the throw back into a returned null and re-introduce the
  // cached miss this split exists to prevent.
  try {
    return await fetchExerciseCached(accessToken, exerciseId)
  } catch (err) {
    if (isExerciseNotFound(err)) return null
    // A genuine backend fault (5xx, unreachable) must not be reported as "this
    // exercise does not exist" — the page turns it into a DataError instead.
    throw err
  }
}

/** Muscle-group lookup table. Reference data — safe to cache for hours. */
export async function getMuscleGroupsCached(
  accessToken: string,
): Promise<MuscleGroup[]> {
  'use cache'
  cacheLife({ revalidate: 3600, expire: 86400 })
  cacheTag('exercises')
  return serverFetch<MuscleGroup[]>('/muscle-groups', accessToken)
}

/** Equipment lookup table. */
export async function getEquipmentCached(
  accessToken: string,
): Promise<Equipment[]> {
  'use cache'
  cacheLife({ revalidate: 3600, expire: 86400 })
  cacheTag('exercises')
  return serverFetch<Equipment[]>('/equipment', accessToken)
}
