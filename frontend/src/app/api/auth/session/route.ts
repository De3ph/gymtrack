import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { encrypt, decrypt, SESSION_COOKIE_NAME, REFRESH_COOKIE_NAME, type SessionPayload } from '@/lib/session'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

/**
 * GET /api/auth/session
 * Reads the HttpOnly session cookie and returns the access token to the client.
 * Used on page load by authStore.initializeAuth() to restore the in-memory token.
 */
export async function GET() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!sessionCookie) {
    return NextResponse.json({ accessToken: null, refreshToken: null, user: null })
  }

  const payload = await decrypt(sessionCookie)
  if (!payload) {
    // Cookie exists but is invalid/expired — clear both cookies
    const response = NextResponse.json({ accessToken: null, refreshToken: null, user: null })
    response.cookies.delete(SESSION_COOKIE_NAME)
    response.cookies.delete(REFRESH_COOKIE_NAME)
    return response
  }

  // The refresh token lives in its own dedicated cookie (see POST) so that a
  // leak of the session cookie does not also expose the long-lived refresh
  // token. Return it to the client so authStore can restore it in memory.
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value || null

  return NextResponse.json({
    accessToken: payload.accessToken,
    userId: payload.userId,
    role: payload.role,
    refreshToken,
  })
}

/**
 * POST /api/auth/session
 * Receives tokens from the client (after successful login/register) and sets
 * them as an HttpOnly, Secure, SameSite cookie.
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { accessToken, refreshToken } = body

  if (!accessToken) {
    return NextResponse.json({ error: 'Missing access token' }, { status: 400 })
  }

  // Verify the access token against the Go backend and fetch the authoritative
  // user profile (userId + role). This prevents a compromised client (XSS) from
  // forging an arbitrary role in the session cookie, which the proxy trusts for
  // route gating. The backend is the source of truth for the user's identity.
  let userId: string
  let role: string
  try {
    const verifyRes = await fetch(`${BACKEND_URL}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
    if (!verifyRes.ok) {
      return NextResponse.json({ error: 'Invalid access token' }, { status: 401 })
    }
    const user = await verifyRes.json()
    userId = user.userId
    role = user.role
  } catch {
    return NextResponse.json({ error: 'Failed to verify access token' }, { status: 502 })
  }

  if (!userId || !role) {
    return NextResponse.json({ error: 'Invalid user profile' }, { status: 400 })
  }

  const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS)

  const payload: SessionPayload = {
    userId,
    role,
    accessToken,
    expiresAt,
  }

  const encrypted = await encrypt(payload)

  const response = NextResponse.json({ success: true })

  response.cookies.set(SESSION_COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })

  // Store the refresh token in a separate, dedicated cookie so that a leak of
  // the session cookie (which only carries the short-lived access token) does
  // not also expose the long-lived refresh token.
  if (refreshToken) {
    response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    })
  }

  return response
}

/**
 * DELETE /api/auth/session
 * Removes the session cookie on logout.
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete(SESSION_COOKIE_NAME)
  response.cookies.delete(REFRESH_COOKIE_NAME)
  return response
}
