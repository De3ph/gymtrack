import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { decrypt, updateSession, SESSION_COOKIE_NAME } from './lib/session';

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

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value

  if (!isPublicRoute(path)) {
    const payload = sessionCookie ? await decrypt(sessionCookie) : null

    if (!payload?.userId) {
      const loginUrl = new URL('/login', req.nextUrl)
      loginUrl.searchParams.set('redirect', path)
      return NextResponse.redirect(loginUrl)
    }

    // Role gate: /admin/* requires admin role
    if (isAdminRoute(path) && payload?.role !== 'admin') {
      const dashboardUrl = new URL('/dashboard', req.nextUrl)
      return NextResponse.redirect(dashboardUrl)
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

  return response
}

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)'
};
