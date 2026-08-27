"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { WorkoutPlanForm } from "@/components/features/workout-plan/WorkoutPlanForm";
import { AssignPlanDialog } from "@/components/features/workout-plan/AssignPlanDialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserPlus } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { useTranslations } from "next-intl";
import type {
  WorkoutPlan,
  WorkoutPlanAssignment,
  WorkoutPlanExercise,
  WorkoutPlanSet,
} from "@/types";

interface WorkoutPlanDetailClientProps {
  plan: WorkoutPlan;
  assignments: WorkoutPlanAssignment[];
  planId: string;
}

export function WorkoutPlanDetailClient({
  plan,
  assignments,
  planId,
}: WorkoutPlanDetailClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("trainer.workout_plans");
  const tc = useTranslations("common.actions");

  const [showEditForm, setShowEditForm] = useState(false);

  if (!plan) {
    return (
      <div className="container mx-auto py-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {t("plan_not_found")}
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="outline"
          onClick={() => router.push(ROUTES.TRAINER_WORKOUT_PLANS)}
          className="rounded-none font-mono text-[10px] uppercase tracking-[0.18em]"
        >
          <ArrowLeft className="size-5" aria-hidden="true" /> {tc("back")}
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {plan.name}
          </h1>
          {plan.description && (
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {plan.description}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          {showEditForm ? (
            <div className="border border-border">
              <header className="border-b border-border px-4 py-3 sm:px-6 sm:py-4">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {t("edit")}
                </h2>
              </header>
              <div className="px-4 py-3 sm:px-6 sm:py-4">
                <WorkoutPlanForm
                  plan={plan}
                  onSuccess={async () => {
                    setShowEditForm(false);
                    await queryClient.invalidateQueries({
                      queryKey: ["workout-plan", planId],
                    });
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="border border-border">
              <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {t("exercises")}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditForm(true)}
                  className="rounded-none font-mono text-[10px] uppercase tracking-[0.18em]"
                >
                  {t("edit")}
                </Button>
              </header>
              <ul className="divide-y divide-border">
                {plan.exercises.map((ex: WorkoutPlanExercise, i: number) => (
                  <li key={ex.exerciseId} className="space-y-1 px-4 py-3 sm:px-6 sm:py-4">
                    <p className="text-base font-semibold text-foreground">
                      {i + 1}. {ex.name}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {t("exercise_detail", {
                        count: ex.sets.length,
                        weights: ex.sets
                          .map(
                            (s: WorkoutPlanSet) => `${s.weight}${s.weightUnit}`,
                          )
                          .join(", "),
                      })}
                    </p>
                    {ex.notes && (
                      <p className="text-sm text-muted-foreground">{ex.notes}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <div className="border border-border">
            <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {t("clients_assigned")} ({assignments.length})
              </h2>
              <AssignPlanDialog
                planId={planId}
                trigger={
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-none font-mono text-[10px] uppercase tracking-[0.18em]"
                  >
                    <UserPlus className="size-5" aria-hidden="true" />{" "}
                    {t("assign")}
                  </Button>
                }
                onSuccess={async () => {
                  await queryClient.invalidateQueries({
                    queryKey: ["workout-plan-assignments", planId],
                  });
                }}
              />
            </header>
            {assignments.length === 0 ? (
              <p className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:px-6 sm:py-4">
                {t("no_clients_yet")}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {assignments.map((a) => (
                  <li
                    key={a.assignmentId}
                    className="px-4 py-3 text-sm text-foreground sm:px-6 sm:py-4"
                  >
                    {t("athlete_label", { id: a.athleteId })}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
