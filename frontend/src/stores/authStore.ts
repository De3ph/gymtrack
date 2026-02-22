import { create } from 'zustand';
import { User } from '@/types';
import { authApi, userApi } from '@/lib/api';
import { TokenService } from '@/lib/token-service';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  initializeAuth: () => Promise<void>;
  handleAuthError: (error: unknown) => void;
  refreshAccessToken: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  isInitialized: false,

  login: async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    const { accessToken, refreshToken, user } = response;

    TokenService.setTokens(accessToken, refreshToken);

    set({
      token: accessToken,
      user,
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true
    });
  },

  logout: async () => {
    try {
      // Call backend logout endpoint
      await authApi.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Always clear local tokens regardless of API call success
      TokenService.remove();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: false
      });
    }
  },

  setUser: (user: User) => {
    set({ user });
  },

  initializeAuth: async () => {
    const state = get();

    // Prevent multiple initializations
    if (state.isInitialized) {
      return;
    }

    set({ isLoading: true });

    const accessToken = TokenService.getAccessToken();

    if (!accessToken) {
      set({
        isLoading: false,
        isAuthenticated: false,
        isInitialized: true
      });
      return;
    }

    try {
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Auth initialization timeout')), 3000)
      );

      const user = await Promise.race([
        userApi.getCurrentUser(),
        timeoutPromise
      ]);

      set({
        token: accessToken,
        user,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true
      });
    } catch (error) {
      console.log('Auth initialization failed, treating as unauthenticated:', error);

      // For any error (timeout, network, auth), clear tokens and mark as unauthenticated
      TokenService.remove();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true
      });
    }
  },

  refreshAccessToken: async (): Promise<boolean> => {
    const refreshToken = TokenService.getRefreshToken();

    if (!refreshToken) {
      return false;
    }

    try {
      const response = await authApi.refreshToken(refreshToken);
      const { accessToken } = response;

      TokenService.setTokens(accessToken, refreshToken);

      // Update the token in state
      set({ token: accessToken });

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  },

  handleAuthError: (error: unknown) => {
    console.error('Auth error:', error);

    // Check for 401/403 errors or token-related issues
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      const isAuthError = errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('token') ||
        errorMessage.includes('forbidden');

      if (isAuthError) {
        // Clear auth state and redirect to login
        TokenService.remove();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true // Keep as true to prevent re-initialization loops
        });

        // Navigate to login page
        if (typeof window !== 'undefined') {
          // Clear React Query cache to prevent stale data
          if (window.__TANSTACK_QUERY_CLIENT__) {
            window.__TANSTACK_QUERY_CLIENT__.clear();
          }
          window.location.href = '/login';
        }
        return;
      }
    }

    // For other errors, just set loading to false
    set({ isLoading: false });
  },
}));
