"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { workoutPlanApi } from "@/lib/api";
import { WorkoutPlanCard } from "./WorkoutPlanCard";
import { Loader2 } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { useTranslations } from "next-intl";

export function MyWorkoutPlans() {
  const t = useTranslations("athlete.workout_plans");
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["my-workout-plans"],
    queryFn: () => workoutPlanApi.getMyPlans(),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const plans = data?.plans || [];

  if (plans.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => (
        <WorkoutPlanCard
          key={plan.planId}
          plan={plan}
          role="athlete"
          onStart={() => router.push(ROUTES.ATHLETE_WORKOUTS + `?planId=${plan.planId}`)}
        />
      ))}
    </div>
  );
}
