"use client";

import { useEffect, useCallback, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useLogout } from "@/lib/hooks/useLogout";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Button } from "@/components/ui/button";
import { useCountdown } from "@/lib/hooks/useCountdown";

export function DashboardClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, initializeAuth, isInitialized, isLoading, isAuthenticated } =
    useAuthStore();
  const { logout } = useLogout();

  const showAuthGate = isInitialized && !isLoading && !isAuthenticated;

  // One-time initialization on mount (initializeAuth is a no-op if already done)
  useEffect(() => {
    if (!isInitialized) {
      initializeAuth();
    }
  }, [initializeAuth, isInitialized]);

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
              <h2 className="font-heading text-lg font-medium">
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

      <DashboardNav
        userRole={user?.role}
        userName={user?.profile?.name}
        onLogout={logout}
      />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
