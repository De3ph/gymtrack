"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { workoutPlanApi } from "@/lib/api";
import { WorkoutPlanCard } from "./WorkoutPlanCard";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

export function ClientPlansTab() {
  const t = useTranslations('trainer.workout_plans')
  const params = useParams();
  const username = params.username as string;

  const { data, isLoading } = useQuery({
    queryKey: ["client-plans", username],
    queryFn: () => workoutPlanApi.getClientPlans(username),
    enabled: !!username,
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
      <div className="text-center py-8 text-muted-foreground">
        {t('no_plans')}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {plans.map((plan) => (
        <WorkoutPlanCard key={plan.planId} plan={plan} role="trainer" />
      ))}
    </div>
  );
}
