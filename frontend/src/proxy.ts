import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { decrypt, updateSession, SESSION_COOKIE_NAME, REFRESH_COOKIE_NAME } from './lib/session';

const intlMiddleware = createMiddleware(routing);

const publicRoutes = ['/login', '/register', '/'];

function isPublicRoute(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean)
  const normalizedPath =
    parts.length > 0 && parts[0].length === 2 && /^[a-z]{2}$/.test(parts[0])
      ? '/' + parts.slice(1).join('/')
      : pathname

  return publicRoutes.some((route) => normalizedPath === route || normalizedPath.startsWith(route + '/'))
}

function isAdminRoute(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean)
  // strip locale prefix (e.g. /en/admin -> /admin)
  const normalized =
    parts.length > 0 && parts[0].length === 2 && /^[a-z]{2}$/.test(parts[0])
      ? '/' + parts.slice(1).join('/')
      : pathname
  return normalized === '/admin' || normalized.startsWith('/admin/')
}

function isAthleteRoute(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean)
  const normalized =
    parts.length > 0 && parts[0].length === 2 && /^[a-z]{2}$/.test(parts[0])
      ? '/' + parts.slice(1).join('/')
      : pathname
  return normalized === '/athlete' || normalized.startsWith('/athlete/')
}

function isTrainerRoute(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean)
  const normalized =
    parts.length > 0 && parts[0].length === 2 && /^[a-z]{2}$/.test(parts[0])
      ? '/' + parts.slice(1).join('/')
      : pathname
  return normalized === '/trainer' || normalized.startsWith('/trainer/')
}


// In-memory decrypt cache to avoid re-decrypt on every navigation.
// TTL is kept intentionally short (500 ms) to avoid serving stale auth
// decisions after logout — the server gate (getSession) is the source of truth.
//
// The Map persists across Edge invocations in the same instance, so it is
// bounded to DECRYPT_CACHE_MAX entries. When the cap is reached, the
// oldest-inserted entry is evicted first (FIFO). We exploit the ES2015 Map
// iteration order, which yields keys in insertion order, and rely on a
// separate keys list (decryptCacheOrder) as a FIFO queue because re-setting an
// existing key would otherwise move it to the end of the Map's iteration
// order — FIFO semantics must be preserved explicitly.
const decryptCache = new Map<string, { payload: any; exp: number }>();
const decryptCacheOrder: string[] = [];
const DECRYPT_CACHE_MAX = 1000;
const DECRYPT_TTL_MS = 500;

async function cachedDecrypt(cookie: string): Promise<any> {
  const hit = decryptCache.get(cookie);
  if (hit && hit.exp > Date.now()) return hit.payload;
  const payload = await decrypt(cookie);
  if (payload) {
    // Enforce the size cap before inserting a brand-new entry: evict the
    // oldest-inserted key (FIFO). Skip eviction when the key already exists,
    // because a re-set only refreshes its value/expiry.
    if (!decryptCache.has(cookie) && decryptCacheOrder.length >= DECRYPT_CACHE_MAX) {
      const oldest = decryptCacheOrder.shift()!;
      decryptCache.delete(oldest);
    }
    // First insertion: record the key at the tail of the FIFO queue. On a
    // cache hit-refresh we keep its original position so queue order is
    // stable and the eviction target stays correct.
    if (!decryptCache.has(cookie)) {
      decryptCacheOrder.push(cookie);
    }
    decryptCache.set(cookie, { payload, exp: Date.now() + DECRYPT_TTL_MS });
  }
  return payload;
}
export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value

  if (!isPublicRoute(path)) {
    const payload = sessionCookie ? await cachedDecrypt(sessionCookie) : null

    if (!payload?.userId) {
      const loginUrl = new URL('/login', req.nextUrl)
      loginUrl.searchParams.set('redirect', path)
      return NextResponse.redirect(loginUrl)
    }

    // Role gates: each role-scoped route requires the matching role. The
    // proxy performs an optimistic check here; the server DAL (verifySession /
    // verifyAdmin) and the Go backend remain the authoritative enforcers.
    if (isAdminRoute(path) && payload?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
    }
    if (isAthleteRoute(path) && payload?.role !== 'athlete') {
      return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
    }
    if (isTrainerRoute(path) && payload?.role !== 'trainer') {
      return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
    }
  }

  // Let next-intl handle i18n routing
  const response = await intlMiddleware(req)

  // Extend session expiry on every request if the session is valid
  if (sessionCookie) {
    const refreshed = await updateSession(sessionCookie)
    if (refreshed) {
      response.cookies.set(SESSION_COOKIE_NAME, refreshed, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      })
    }
  }

  // Roll the separate refresh-token cookie alongside the session so the
  // refresh token stays valid as long as the (rolling) session does.
  const refreshCookie = req.cookies.get(REFRESH_COOKIE_NAME)?.value
  if (refreshCookie) {
    response.cookies.set(REFRESH_COOKIE_NAME, refreshCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })
  }

  return response
}

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|monitoring|.*\\..*).*)'
};
