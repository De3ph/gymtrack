"use client";

import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { MyWorkoutPlans } from "@/components/features/workout-plan/MyWorkoutPlans";
import { ROUTES } from "@/lib/routes";
import { useTranslations } from "next-intl";

export default function AthleteWorkoutPlansPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const t = useTranslations("athlete.workout_plans");

  useEffect(() => {
    if (user && user.role !== "athlete") {
      router.push(ROUTES.HOME);
    }
  }, [user, router]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <MyWorkoutPlans />
    </div>
  );
}
