import { create } from "zustand";
import { router } from "expo-router";
import * as authLib from "@/lib/auth";
import { setSessionExpiredHandler } from "@/api/client";
import { queryClient } from "@/lib/query-client";
import type { LoginResponse, User } from "@/types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;

  setUser: (user: User | null) => void;
  setInitialized: () => void;
  setSession: (session: LoginResponse) => Promise<void>;
  resetSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,

  setUser: (user) => set({ user }),

  setInitialized: () => set({ isInitialized: true }),

  setSession: async ({ accessToken, refreshToken, user }) => {
    await authLib.setTokens(accessToken, refreshToken);
    set({ user, isAuthenticated: true, isInitialized: true });
  },

  resetSession: async () => {
    await authLib.clearTokens();
    queryClient.clear();
    set({ user: null, isAuthenticated: false, isInitialized: true });
  },
}));

setSessionExpiredHandler(() => {
  void queryClient.cancelQueries();
  queryClient.clear();
  useAuthStore.setState({ user: null, isAuthenticated: false });
  router.replace("/(auth)/login");
});
