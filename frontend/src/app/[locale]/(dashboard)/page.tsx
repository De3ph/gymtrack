"use client";

import { AthleteDashboardContent } from "@/components/features/dashboard/AthleteDashboardContent";
import { TrainerDashboardContent } from "@/components/features/dashboard/TrainerDashboardContent";
import { Spinner } from "@/components/ui/spinner";
import { ROUTES } from "@/lib/routes";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RoleDashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(`${ROUTES.HOME}?error=auth_required`);
    }
  }, [isLoading, router, user]);

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
