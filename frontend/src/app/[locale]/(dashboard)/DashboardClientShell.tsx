"use client";

import { useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { useRouter } from "@/i18n/navigation";
import { ROUTES } from "@/lib/routes";

export function DashboardClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, initializeAuth, isInitialized, isLoading } =
    useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) {
      initializeAuth();
    }
  }, [initializeAuth, isInitialized]);

  const handleLogout = useCallback(() => {
    logout();
    router.replace(ROUTES.LOGIN);
  }, [router, logout]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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