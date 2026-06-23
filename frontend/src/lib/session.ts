import 'server-only'
import { SignJWT, jwtVerify } from 'jose'

const secretKey = process.env.SESSION_SECRET
if (!secretKey) {
  throw new Error('SESSION_SECRET environment variable is not set')
}

const encodedKey = new TextEncoder().encode(secretKey)
const SESSION_COOKIE_NAME = 'session'

export interface SessionPayload {
  userId: string
  role: string
  accessToken: string
  refreshToken: string
  expiresAt: Date
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload, expiresAt: payload.expiresAt.toISOString() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey)
}

export async function decrypt(
  session: string | undefined = ''
): Promise<SessionPayload | null> {
  if (!session) return null

  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    })

    const data = payload as unknown as Record<string, unknown>

    return {
      userId: data.userId as string,
      role: data.role as string,
      accessToken: data.accessToken as string,
      refreshToken: data.refreshToken as string,
      expiresAt: new Date(data.expiresAt as string),
    }
  } catch {
    return null
  }
}

/**
 * Extends the session cookie expiry on each request (called from proxy.ts).
 * Returns the re-encrypted session string if valid, or null if the session
 * is missing/expired — which lets the proxy decide whether to redirect.
 */
export async function updateSession(sessionCookie: string | undefined): Promise<string | null> {
  const payload = await decrypt(sessionCookie)
  if (!payload) return null

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  payload.expiresAt = expiresAt

  return encrypt(payload)
}

export { SESSION_COOKIE_NAME }
