import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { encrypt, decrypt, SESSION_COOKIE_NAME, type SessionPayload } from '@/lib/session'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

/**
 * GET /api/auth/session
 * Reads the HttpOnly session cookie and returns the access token to the client.
 * Used on page load by authStore.initializeAuth() to restore the in-memory token.
 */
export async function GET() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!sessionCookie) {
    return NextResponse.json({ accessToken: null, user: null })
  }

  const payload = await decrypt(sessionCookie)
  if (!payload) {
    // Cookie exists but is invalid/expired — clear it
    const response = NextResponse.json({ accessToken: null, user: null })
    response.cookies.delete(SESSION_COOKIE_NAME)
    return response
  }

  return NextResponse.json({
    accessToken: payload.accessToken,
    userId: payload.userId,
    role: payload.role,
  })
}

/**
 * POST /api/auth/session
 * Receives tokens from the client (after successful login/register) and sets
 * them as an HttpOnly, Secure, SameSite cookie.
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { accessToken, refreshToken, userId, role } = body

  if (!accessToken || !userId || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS)

  const payload: SessionPayload = {
    userId,
    role,
    accessToken,
    refreshToken: refreshToken || '',
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

  return response
}

/**
 * DELETE /api/auth/session
 * Removes the session cookie on logout.
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete(SESSION_COOKIE_NAME)
  return response
}
