import { create } from "zustand";
import * as authLib from "@/lib/auth";
import { authApi } from "@/api/authApi";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;

  initializeAuth: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    role: string;
    profile?: Record<string, unknown>;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,

  initializeAuth: async () => {
    try {
      const token = await authLib.getAccessToken();
      if (!token) {
        set({ isInitialized: true });
        return;
      }
      const user = await authApi.getMe();
      set({ user, isAuthenticated: true, isInitialized: true });
    } catch {
      await authLib.clearTokens();
      set({ isInitialized: true });
    }
  },

  login: async (identifier, password) => {
    const { accessToken, refreshToken, user } = await authApi.login({
      identifier,
      password,
    });
    await authLib.setTokens(accessToken, refreshToken);
    set({ user, isAuthenticated: true });
  },

  register: async (data) => {
    // Register first (returns { message, userId })
    await authApi.register(data);
    // Then auto-login to get tokens
    const { accessToken, refreshToken, user } = await authApi.login({
      identifier: data.email,
      password: data.password,
    });
    await authLib.setTokens(accessToken, refreshToken);
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // best-effort
    }
    await authLib.clearTokens();
    set({ user: null, isAuthenticated: false });
  },
}));
