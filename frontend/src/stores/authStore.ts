import { create } from 'zustand';
import { User } from '@/types';
import { authApi, userApi } from '@/lib/api';
import { tokenService } from '@/lib/token-service';
import { ROUTES } from '@/lib/routes';

const SESSION_API = '/api/auth/session';

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  login: (identifier: string, password: string) => Promise<User>
  logout: () => Promise<void>
  setUser: (user: User) => void
  initializeAuth: () => Promise<void>
  handleAuthError: (error: unknown) => Promise<void>
  refreshAccessToken: () => Promise<boolean>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  isInitialized: false,

  login: async (identifier: string, password: string) => {
    try {
      const response = await authApi.login({ identifier, password })
      const { accessToken, refreshToken, user } = response

      tokenService.setTokens(accessToken, refreshToken)

      await fetch(SESSION_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken,
          refreshToken,
        }),
      })

      set({
        token: accessToken,
        user,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
      })

      return user
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  logout: async () => {
    // 1. Invalidate server-side FIRST, while the access token is still in memory
    //    (api-client reads tokenService for the Authorization header).
    try {
      await authApi.logout()
    } catch { /* best-effort */ }

    // 2. Clear in-memory tokens
    tokenService.remove()

    // 3. Delete the HttpOnly session cookie — AWAIT so the browser actually
    //    deletes it before the caller navigates away.
    try {
      await fetch(SESSION_API, { method: 'DELETE', keepalive: true })
    } catch { /* best-effort */ }

    // 4. Reset client state — keep isInitialized: true so the auth gate can
    //    render immediately instead of re-running initializeAuth().
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true,
    })
  },

  setUser: (user: User) => {
    set({ user })
  },

  initializeAuth: async () => {
    const state = get()

    // Prevent multiple initializations
    if (state.isInitialized) {
      return
    }

    set({ isLoading: true })

    try {
      // 1. Recover access token from HttpOnly cookie (via server API)
      const sessionRes = await fetch(SESSION_API)
      const session = await sessionRes.json()

      if (!session.accessToken) {
        set({
          isLoading: false,
          isAuthenticated: false,
          isInitialized: true,
        })
        return
      }

      // 2. Restore both tokens in memory (access + refresh). The refresh token
      //    is recovered from its dedicated cookie via the GET handler.
      tokenService.setTokens(session.accessToken, session.refreshToken || '')

      // 3. Fetch full user profile from Go backend
      const user = await userApi.getCurrentUser()

      set({
        token: session.accessToken,
        user,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
      })
    } catch (error) {
      console.log(
        'Auth initialization failed, treating as unauthenticated:',
        error
      )

      tokenService.remove()
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
      })
    }
  },

  refreshAccessToken: async (): Promise<boolean> => {
    const refreshToken = tokenService.getRefreshToken()

    if (!refreshToken) {
      return false
    }

    try {
      const response = await authApi.refreshToken(refreshToken)
      const { accessToken, refreshToken: newRefreshToken } = response

      // Handle refresh-token rotation: if the backend issues a new refresh
      // token, use it; otherwise reuse the existing one.
      const effectiveRefreshToken = newRefreshToken || refreshToken

      // Update both in-memory tokens
      tokenService.setTokens(accessToken, effectiveRefreshToken)

      // Update the HttpOnly cookies with the refreshed tokens. The server
      // derives userId/role from the backend, so they are not sent here.
      await fetch(SESSION_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken,
          refreshToken: effectiveRefreshToken,
        }),
      })

      // Update the token in state
      set({ token: accessToken })

      return true
    } catch (error) {
      console.error('Token refresh failed:', error)
      return false
    }
  },

  handleAuthError: async (error: unknown) => {
    console.error('Auth error:', error)

    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase()
      const isAuthError =
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('token') ||
        errorMessage.includes('forbidden')

      if (isAuthError) {
        tokenService.remove()
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
        })

        // Clear the session cookie — await so it completes before navigating
        try {
          await fetch(SESSION_API, { method: 'DELETE', keepalive: true })
        } catch { /* best-effort */ }

        if (typeof window !== 'undefined') {
          if (window.__TANSTACK_QUERY_CLIENT__) {
            window.__TANSTACK_QUERY_CLIENT__.clear()
          }
          window.location.href = ROUTES.LOGIN
        }
        return
      }
    }

    set({ isLoading: false })
  }
}))
