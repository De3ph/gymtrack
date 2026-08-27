"use client";

import { AthleteDashboardContent } from "@/components/features/dashboard/AthleteDashboardContent";
import { TrainerDashboardContent } from "@/components/features/dashboard/TrainerDashboardContent";
import { Spinner } from "@/components/ui/spinner";
import { useAuthStore } from "@/stores/authStore";
import { useLogout } from "@/lib/hooks/useLogout";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RoleDashboardPage() {
  const { user, isLoading } = useAuthStore();
  const { logout } = useLogout();

  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      logout();
    }
  }, [isLoading, user, logout]);

  useEffect(() => {
    if (!isLoading && user?.role === "admin") {
      router.replace("/admin");
    }
  }, [isLoading, router, user?.role]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <Spinner className="size-4" />
          <span>Loading</span>
        </div>
      </div>
    );
  }

  if (user.role === "trainer") {
    return <TrainerDashboardContent />;
  }

  return <AthleteDashboardContent />;
}
