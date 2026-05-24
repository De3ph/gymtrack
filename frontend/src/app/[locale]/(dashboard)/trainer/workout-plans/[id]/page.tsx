"use client";

import { useAuthStore } from "@/stores/authStore";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { workoutPlanApi } from "@/lib/api";
import { WorkoutPlanForm } from "@/components/features/workout-plan/WorkoutPlanForm";
import { AssignPlanDialog } from "@/components/features/workout-plan/AssignPlanDialog";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, UserPlus } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TrainerWorkoutPlanDetailPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const planId = params.id as string;
  const t = useTranslations("trainer.workout_plans");

  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    if (user && user.role !== "trainer") {
      router.push(ROUTES.HOME);
    }
  }, [user, router]);

  const { data: plan, isLoading } = useQuery({
    queryKey: ["workout-plan", planId],
    queryFn: () => workoutPlanApi.getById(planId),
    enabled: !!planId,
  });

  const { data: assignmentsData } = useQuery({
    queryKey: ["workout-plan-assignments", planId],
    queryFn: () => workoutPlanApi.getAssignments(planId),
    enabled: !!planId,
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-muted-foreground">Plan not found.</p>
      </div>
    );
  }

  const assignments = assignmentsData?.assignments || [];

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push(ROUTES.TRAINER_WORKOUT_PLANS)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
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
                  {plan.exercises.map((ex, i) => (
                    <li key={ex.exerciseId} className="border-b pb-3 last:border-0">
                      <p className="font-medium">{i + 1}. {ex.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {ex.sets.length} set{ex.sets.length > 1 ? "s" : ""} — target weights:{" "}
                        {ex.sets.map(s => `${s.weight}${s.weightUnit}`).join(", ")}
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
                <p className="text-sm text-muted-foreground">No clients assigned yet.</p>
              ) : (
                <ul className="space-y-2">
                  {assignments.map((a) => (
                    <li key={a.assignmentId} className="text-sm">
                      Athlete: {a.athleteId}
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
