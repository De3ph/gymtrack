"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Button } from "@/components/ui/button";

export function DashboardClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, initializeAuth, isInitialized, isLoading, isAuthenticated } =
    useAuthStore();
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [countdown, setCountdown] = useState(2);

  useEffect(() => {
    if (!isInitialized) {
      initializeAuth();
    }
  }, [initializeAuth, isInitialized]);

  useEffect(() => {
    if (isInitialized && !isLoading && !isAuthenticated) {
      setShowAuthGate(true);
    }
  }, [isInitialized, isLoading, isAuthenticated]);

  // Build locale-aware login URL from the current path
  const loginUrl =
    typeof window !== 'undefined' && /^\/[a-z]{2}\//.test(window.location.pathname)
      ? `/${window.location.pathname.split('/')[1]}/login`
      : '/login';

  useEffect(() => {
    if (!showAuthGate) return;

    setCountdown(2);
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [showAuthGate]);

  // Navigate when countdown reaches 0 — separate from the countdown state updater
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

  const handleLogout = useCallback(() => {
    logout();
    window.location.href = loginUrl;
  }, [logout, loginUrl]);

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
        onLogout={handleLogout}
      />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}