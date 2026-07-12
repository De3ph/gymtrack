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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface WorkoutPlanDetailClientProps {
  plan: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assignments: any[];
  planId: string;
}

export function WorkoutPlanDetailClient({ plan, assignments, planId }: WorkoutPlanDetailClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("trainer.workout_plans");
  const tc = useTranslations("common.actions");

  const [showEditForm, setShowEditForm] = useState(false);



  if (!plan) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-muted-foreground">{t('plan_not_found')}</p>
      </div>
    );
  }



  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push(ROUTES.TRAINER_WORKOUT_PLANS)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {tc('back')}
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{plan.name}</h1>
          {plan.description && (
            <p className="text-muted-foreground">{plan.description}</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          {showEditForm ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("edit")}</CardTitle>
              </CardHeader>
              <CardContent>
                <WorkoutPlanForm
                  plan={plan}
                  onSuccess={async () => {
                    setShowEditForm(false);
                    await queryClient.invalidateQueries({ queryKey: ["workout-plan", planId] });
                  }}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t("exercises")}</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowEditForm(true)}>
                  {t("edit")}
                </Button>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {plan.exercises.map((ex: any, i: number) => (
                    <li key={ex.exerciseId} className="border-b pb-3 last:border-0">
                      <p className="font-medium">{i + 1}. {ex.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {t('exercise_detail', { count: ex.sets.length, weights: ex.sets.map((s: any) => `${s.weight}${s.weightUnit}`).join(", ") })}
                      </p>
                      {ex.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{ex.notes}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {t("clients_assigned")} ({assignments.length})
                <AssignPlanDialog
                  planId={planId}
                  trigger={
                    <Button size="sm" variant="outline">
                      <UserPlus className="w-4 h-4 mr-1" /> {t("assign")}
                    </Button>
                  }
                  onSuccess={async () => {
                    await queryClient.invalidateQueries({ queryKey: ["workout-plan-assignments", planId] });
                  }}
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('no_clients_yet')}</p>
              ) : (
                <ul className="space-y-2">
                  {assignments.map((a) => (
                    <li key={a.assignmentId} className="text-sm">
                      {t('athlete_label', { id: a.athleteId })}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
