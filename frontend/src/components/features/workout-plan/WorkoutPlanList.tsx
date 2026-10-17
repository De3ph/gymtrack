"use client";

import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { WorkoutPlanCard } from "./WorkoutPlanCard";
import { WorkoutPlan } from "@/types";
import { workoutPlanApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

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
  const tAthlete = useTranslations("athlete.workout_plans");
  const [viewingPlan, setViewingPlan] = useState<WorkoutPlan | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: qk.plans.own,
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
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <WorkoutPlanCard
            key={plan.planId}
            plan={plan}
            role="trainer"
            onEdit={() => onEdit(plan)}
            onDelete={() => onDelete(plan)}
            onAssign={() => onAssign(plan)}
            onView={setViewingPlan}
          />
        ))}
      </div>

      <Dialog
        open={!!viewingPlan}
        onOpenChange={(open) => {
          if (!open) setViewingPlan(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewingPlan?.name}</DialogTitle>
            {viewingPlan?.description && (
              <DialogDescription>{viewingPlan.description}</DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {viewingPlan?.exercises.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {tAthlete("exercises")} — 0
              </p>
            )}
            {viewingPlan?.exercises
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((exercise) => (
                <Fragment key={exercise.exerciseId}>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">
                        {exercise.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tAthlete("set_format", {
                          count: exercise.sets.length,
                          reps: exercise.sets.map((s) => s.reps).join(","),
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {exercise.sets
                          .map((s) => `${s.weight}${s.weightUnit} x ${s.reps}`)
                          .join(" • ")}
                      </p>
                    </div>
                    {exercise.notes && (
                      <p className="text-xs text-muted-foreground ml-3 shrink-0 max-w-30 text-right">
                        {exercise.notes}
                      </p>
                    )}
                  </div>
                  <Separator />
                </Fragment>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
