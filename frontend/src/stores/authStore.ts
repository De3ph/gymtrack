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
  handleAuthError: (error: unknown) => void
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
          userId: user.userId,
          role: user.role,
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
    try {
      // 1. Remove HttpOnly session cookie
      await fetch(SESSION_API, { method: 'DELETE' })
    } catch (error) {
      console.error('Session delete call failed:', error)
    }

    // 2. Best-effort backend logout to invalidate refresh token
    try {
      await authApi.logout()
    } catch {
      // Non-critical; the session cookie is already gone
    }

    // 3. Clear in-memory tokens
    tokenService.remove()
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
    })

    // 4. Redirect to login with a full page reload so middleware picks up
    //    the cleared session cookie and the auth store re-initialises cleanly.
    if (typeof window !== 'undefined') {
      window.location.href = ROUTES.LOGIN
    }
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

      // 2. Restore access token in memory
      tokenService.set(session.accessToken)

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
      const { accessToken } = response

      // Update in-memory token
      tokenService.set(accessToken)

      // Update the HttpOnly cookie with refreshed token
      const state = get()
      await fetch(SESSION_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken,
          refreshToken,
          userId: state.user?.userId,
          role: state.user?.role,
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

  handleAuthError: (error: unknown) => {
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

        // Clear the session cookie
        fetch(SESSION_API, { method: 'DELETE' }).catch(() => {})

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
