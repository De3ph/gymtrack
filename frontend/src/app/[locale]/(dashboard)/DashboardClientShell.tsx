"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { DashboardNav } from "@/components/layout/dashboard-nav";

export function DashboardClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, initializeAuth, isInitialized, isLoading } =
    useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      initializeAuth();
    }
  }, [initializeAuth, isInitialized]);

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
        userName={user?.profile.name}
        onLogout={logout}
      />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
