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

  // Redirect admin users to their dashboard
  useEffect(() => {
    if (!isLoading && user?.role === "admin") {
      router.replace("/admin");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-lg text-muted-foreground">
          <Spinner className="size-6 text-primary" />
          Loading...
        </div>
      </div>
    );
  }

  if (user.role === "trainer") {
    return <TrainerDashboardContent />;
  }

  return <AthleteDashboardContent />;
}
