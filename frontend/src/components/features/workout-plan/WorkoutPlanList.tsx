"use client";

import { useQuery } from "@tanstack/react-query";
import { WorkoutPlanCard } from "./WorkoutPlanCard";
import { WorkoutPlan } from "@/types";
import { workoutPlanApi } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface WorkoutPlanListProps {
  plans?: WorkoutPlan[];
  onEdit: (plan: WorkoutPlan) => void;
  onDelete: (plan: WorkoutPlan) => void;
  onAssign: (plan: WorkoutPlan) => void;
}

export function WorkoutPlanList({
  plans: providedPlans,
  onEdit,
  onDelete,
  onAssign,
}: WorkoutPlanListProps) {
  const t = useTranslations("trainer.workout_plans");

  const { data, isLoading } = useQuery({
    queryKey: ["workout-plans"],
    queryFn: () => workoutPlanApi.getAll(),
    enabled: providedPlans === undefined,
  });

  const plans = providedPlans ?? data?.plans ?? [];

  if (providedPlans === undefined && isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("no_plans")}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => (
        <WorkoutPlanCard
          key={plan.planId}
          plan={plan}
          role="trainer"
          onEdit={() => onEdit(plan)}
          onDelete={() => onDelete(plan)}
          onAssign={() => onAssign(plan)}
        />
      ))}
    </div>
  );
}
