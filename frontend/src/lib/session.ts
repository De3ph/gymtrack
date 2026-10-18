import 'server-only'
import { SignJWT, jwtVerify } from 'jose'

/**
 * Resolved on first use, not at module evaluation.
 *
 * SESSION_SECRET is a runtime secret and is deliberately absent from the image
 * build (see frontend/Dockerfile). Reading it at module scope made `next build`
 * fail while collecting page data for /[locale]: prerendering imports this
 * module through lib/dal.ts, so the throw fired during the build even though no
 * session was actually being encrypted. Reading it lazily keeps the fail-fast
 * behaviour where it belongs — at the first real encrypt/decrypt — while
 * leaving the build secret-free.
 */
let cachedKey: Uint8Array | null = null

function getSecretKey(): Uint8Array {
  if (cachedKey) return cachedKey

  const secretKey = process.env.SESSION_SECRET
  if (!secretKey) {
    throw new Error('SESSION_SECRET environment variable is not set')
  }

  cachedKey = new TextEncoder().encode(secretKey)
  return cachedKey
}

const SESSION_COOKIE_NAME = 'session'
const REFRESH_COOKIE_NAME = 'refresh_token'

export interface SessionPayload {
  userId: string
  role: string
  accessToken: string
  expiresAt: Date
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload, expiresAt: payload.expiresAt.toISOString() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecretKey())
}

export async function decrypt(
  session: string | undefined = ''
): Promise<SessionPayload | null> {
  if (!session) return null

  try {
    const { payload } = await jwtVerify(session, getSecretKey(), {
      algorithms: ['HS256'],
    })

    const data = payload as unknown as Record<string, unknown>

    return {
      userId: data.userId as string,
      role: data.role as string,
      accessToken: data.accessToken as string,
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

export { SESSION_COOKIE_NAME, REFRESH_COOKIE_NAME }
