"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { workoutPlanApi } from "@/lib/api";
import { WorkoutPlanCard } from "./WorkoutPlanCard";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { qk } from "@/lib/query-keys";
import { ApiErrorHandler } from "@/lib/error-handler";
import { DataError } from "@/components/features/DataError";

export function ClientPlansTab() {
  const t = useTranslations('trainer.workout_plans')
  const params = useParams();
  const username = params.username as string;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.plans.byClient(username),
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

  if (error) {
    return (
      <DataError
        message={ApiErrorHandler.handle(error)}
        onRetry={() => refetch()}
      />
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
