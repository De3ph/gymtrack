import { create } from 'zustand';
import { User } from '@/types';
import { authApi, userApi } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  initializeAuth: () => Promise<void>;
  handleAuthError: (error: unknown) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    const token = response.token;

    localStorage.setItem('token', token);

    // Fetch user data
    const user = await userApi.getCurrentUser();

    set({
      token,
      user,
      isAuthenticated: true,
      isLoading: false
    });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false
    });
  },

  setUser: (user: User) => {
    set({ user });
  },

  initializeAuth: async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const user = await userApi.getCurrentUser();
      set({
        token,
        user,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error) {
      useAuthStore.getState().handleAuthError(error);
    }
  },

  handleAuthError: (error: unknown) => {
    console.error('Auth error:', error);

    // Check for 401/403 errors or token-related issues
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('token')) {
        // Clear auth state and redirect to login
        localStorage.removeItem('token');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false
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
