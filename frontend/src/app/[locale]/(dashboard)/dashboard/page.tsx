"use client";

import { AdminDashboardPanel } from "@/components/features/dashboard/AdminDashboardPanel";
import { AthleteDashboardContent } from "@/components/features/dashboard/AthleteDashboardContent";
import { TrainerDashboardContent } from "@/components/features/dashboard/TrainerDashboardContent";
import { Spinner } from "@/components/ui/spinner";
import { useAuthStore } from "@/stores/authStore";
import { useLogout } from "@/lib/hooks/useLogout";
import { useEffect } from "react";

export default function RoleDashboardPage() {
  const { user, isLoading } = useAuthStore();
  const { logout } = useLogout();

  useEffect(() => {
    if (!isLoading && !user) {
      logout();
    }
  }, [isLoading, user, logout]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <Spinner className="size-5" />
          <span>Loading</span>
        </div>
      </div>
    );
  }

  if (user.role === "admin") {
    return <AdminDashboardPanel />;
  }

  if (user.role === "trainer") {
    return <TrainerDashboardContent />;
  }

  return <AthleteDashboardContent />;
}
