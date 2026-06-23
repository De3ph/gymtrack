import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { decrypt, SESSION_COOKIE_NAME } from '@/lib/session'

export const verifySession = cache(async () => {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value
  const payload = await decrypt(sessionCookie)

  if (!payload?.userId) {
    redirect('/login')
  }

  return {
    isAuth: true,
    userId: payload.userId,
    role: payload.role,
  }
})
