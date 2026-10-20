import { create } from 'zustand';
import { User } from '@/types';
import { authApi, userApi, toUser } from '@/lib/api';
import { tokenService } from '@/lib/token-service';
import { refreshTokens, onTokenRefreshed } from '@/lib/auth-refresh';
import { clearSessionExpiryNotice } from '@/lib/session-expiry';
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
  initializeAuth: (initialUser?: User) => Promise<void>
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

      // A new session means a fresh expiry notice is allowed again.
      clearSessionExpiryNotice()

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

  initializeAuth: async (initialUser?: User) => {
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

      // A restored session means a fresh expiry notice is allowed again.
      clearSessionExpiryNotice()

      // 3. Use the user the server layout already fetched, if present. This
      //    removes the second sequential round-trip (/users/me) from the
      //    critical path on every dashboard navigation.
      let safeUser: User
      if (initialUser) {
        safeUser = initialUser
      } else {
        const user = await userApi.getCurrentUser()

        // The generated API type marks every field optional, but the backend
        // always returns them. toUser narrows it in one place.
        safeUser = toUser(user, state.user)
      }

      set({
        token: session.accessToken,
        user: safeUser,
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
    // The refresh itself lives in lib/auth-refresh so the API client can
    // reach it without importing the store (module cycle). It is
    // single-flight: concurrent 401s share ONE network refresh.
    const outcome = await refreshTokens();

    if (outcome !== 'refreshed') {
      return false;
    }

    // Update the token in state
    set({ token: tokenService.getAccessToken() });

    return true;
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
          // Clear React Query cache so stale server state doesn't survive the
          // auth reset. (Avoids a full page reload, which would drop it.)
          window.__TANSTACK_QUERY_CLIENT__?.clear()

          // Client-side navigation via Next.js router — no full reload.
          if (window.__NAVIGATE__) {
            window.__NAVIGATE__(ROUTES.LOGIN)
          } else {
            window.location.href = ROUTES.LOGIN
          }
        }
        return
      }
    }

    set({ isLoading: false })
  }
}))

// A refresh can also be triggered by the API client (it renews the token
// when a request comes back 401). The store has to learn about those tokens
// too, otherwise its copy goes stale. The listener keeps it in sync without
// the store having to be imported by the API layer.
onTokenRefreshed((accessToken) => {
  useAuthStore.setState({ token: accessToken })
})
