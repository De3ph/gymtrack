import { useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authApi } from "@/api/authApi";
import { isSessionExpiredError } from "@/api/client";
import * as authLib from "@/lib/auth";
import { useAuthStore } from "@/stores/authStore";
import type { LoginResponse, User } from "@/types";

export const authKeys = {
  me: ["user"] as const,
};

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  role: string;
  profile?: Record<string, unknown>;
}

function usePersistSession() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);

  return useCallback(
    async (session: LoginResponse) => {
      await setSession(session);
      queryClient.setQueryData(authKeys.me, session.user);
    },
    [queryClient, setSession]
  );
}

export function useInitializeAuth() {
  const setInitialized = useAuthStore((s) => s.setInitialized);

  const { data, error, isSuccess, isError } = useQuery({
    queryKey: authKeys.me,
    queryFn: async (): Promise<User | null> => {
      const token = await authLib.getAccessToken();
      if (!token) return null;
      return authApi.getMe();
    },
    retry: (failureCount, err) =>
      !isSessionExpiredError(err) && failureCount < 2,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (isError) {
      if (isSessionExpiredError(error)) {
        void authLib.clearTokens().finally(setInitialized);
      } else {
        setInitialized();
      }
      return;
    }
    if (isSuccess) {
      useAuthStore.setState(
        data
          ? { user: data, isAuthenticated: true }
          : { user: null, isAuthenticated: false }
      );
      setInitialized();
    }
  }, [data, error, isError, isSuccess, setInitialized]);
}

export function useLogin() {
  const persistSession = usePersistSession();

  return useMutation({
    mutationFn: (data: { identifier: string; password: string }) =>
      authApi.login(data),
    onSuccess: persistSession,
  });
}

export function useRegister() {
  const persistSession = usePersistSession();

  return useMutation({
    mutationFn: async (data: RegisterPayload): Promise<LoginResponse> => {
      await authApi.register(data);
      return authApi.login({
        identifier: data.email,
        password: data.password,
      });
    },
    onSuccess: persistSession,
  });
}

export function useLogout() {
  const resetSession = useAuthStore((s) => s.resetSession);

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => resetSession(),
  });
}
