"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { useLogout } from "@/lib/hooks/useLogout";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { WelcomeGifDialog } from "@/components/features/welcome/welcome-gif-dialog";
import { Button } from "@/components/ui/button";
import { useCountdown } from "@/lib/hooks/useCountdown";
import { qk } from "@/lib/query-keys";
import type { User } from "@/types";

export function DashboardClientShell({
  children,
  defaultSidebarOpen,
  initialUser,
}: {
  children: React.ReactNode;
  /** Persisted sidebar rail state, read from the cookie in the server layout. */
  defaultSidebarOpen?: boolean;
  /** Authoritative user fetched by the server layout (RSC). */
  initialUser?: User;
}) {
  const { user, initializeAuth, isInitialized, isLoading, isAuthenticated } =
    useAuthStore();
  const { logout } = useLogout();
  const queryClient = useQueryClient();

  // Seed the query cache before children render so the profile query (and any
  // other consumer of qk.currentUser) starts with the server's data instead of
  // firing a duplicate /users/me request after hydration.
  useState(() => {
    if (initialUser) queryClient.setQueryData(qk.currentUser, initialUser);
  });

  const showAuthGate = isInitialized && !isLoading && !isAuthenticated;

  // One-time initialization on mount. Passing the server user skips the
  // redundant /users/me round-trip; only the in-memory token still needs to be
  // recovered from the HttpOnly cookie.
  useEffect(() => {
    if (!isInitialized) {
      initializeAuth(initialUser);
    }
  }, [initializeAuth, isInitialized, initialUser]);

  // Build locale-aware login URL from the current path
  const loginUrl =
    typeof window !== 'undefined' && /^\/[a-z]{2}\//.test(window.location.pathname)
      ? `/${window.location.pathname.split('/')[1]}/login`
      : '/login';

  // Countdown timer — resets to 3 when the auth gate appears, ticks to 0
  const countdown = useCountdown({ active: showAuthGate, start: 3 });

  // Navigate when countdown reaches 0
  const hasRedirected = useRef(false);
  useEffect(() => {
    if (!showAuthGate || countdown > 0 || hasRedirected.current) return;
    hasRedirected.current = true;
    window.location.href = loginUrl;
  }, [showAuthGate, countdown, loginUrl]);

  const handleGoToLogin = useCallback(() => {
    hasRedirected.current = true;
    window.location.href = loginUrl;
  }, [loginUrl]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {showAuthGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-popover p-6 shadow-lg ring-1 ring-foreground/10">
            <div className="mb-4 flex flex-col gap-2">
              <h2 className="font-heading text-lg font-semibold">
                Session Required
              </h2>
              <p className="text-sm text-muted-foreground">
                You need to be logged in to access this page.
              </p>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Redirecting to login in {countdown} second
              {countdown !== 1 ? "s" : ""}...
            </p>
            <Button className="w-full" onClick={handleGoToLogin}>
              Go to Login
            </Button>
          </div>
        </div>
      )}

      <DashboardShell
        userRole={user?.role}
        userName={user?.profile?.name}
        onLogout={logout}
        defaultSidebarOpen={defaultSidebarOpen}
      >
        {!showAuthGate && <WelcomeGifDialog />}
        {children}
      </DashboardShell>
    </div>
  );
}
