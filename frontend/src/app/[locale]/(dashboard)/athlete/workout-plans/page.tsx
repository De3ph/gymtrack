"use client";

import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WorkoutPlanCard } from "@/components/features/workout-plan/WorkoutPlanCard";
import { WorkoutPlanForm } from "@/components/features/workout-plan/WorkoutPlanForm";
import { MyWorkoutPlans } from "@/components/features/workout-plan/MyWorkoutPlans";
import { WorkoutPlan } from "@/types";
import { workoutPlanApi } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import { useTranslations } from "next-intl";
import { revalidateWorkoutPlansCache } from "@/lib/actions/cache";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { STALE_TIMES } from "@/lib/api/api-constants";

const PLAN_LIMIT = 3;

export default function AthleteWorkoutPlansPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const t = useTranslations("athlete.workout_plans");
  const tc = useTranslations("common.actions");
  const queryClient = useQueryClient();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<WorkoutPlan | null>(null);

  useEffect(() => {
    if (user && user.role !== "athlete") {
      router.push(ROUTES.HOME);
    }
  }, [user, router]);

  const { data: ownData, isLoading: ownLoading } = useQuery({
    queryKey: ["workout-plans"],
    queryFn: () => workoutPlanApi.getAll(),
    staleTime: STALE_TIMES.FIVE_MINUTES,
  });
  const ownPlans = ownData?.plans ?? [];
  const limitReached = ownPlans.length >= PLAN_LIMIT;

  const handleDelete = async () => {
    if (!deletingPlan) return;
    try {
      await workoutPlanApi.delete(deletingPlan.planId);
      await revalidateWorkoutPlansCache();
      queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
      queryClient.invalidateQueries({ queryKey: ["my-workout-plans"] });
      setDeletingPlan(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {/* My Plans */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">{t("own_plans")}</h2>
            <span className="text-sm text-muted-foreground">
              {t("limit_counter", { count: ownPlans.length })}
            </span>
          </div>
          <Button onClick={() => setShowCreateForm(true)} disabled={limitReached}>
            <Plus className="mr-2 h-4 w-4" /> {t("create")}
          </Button>
        </div>
        {limitReached && (
          <p className="text-sm text-muted-foreground">{t("limit_reached")}</p>
        )}
        {ownLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : ownPlans.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t("no_plans")}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ownPlans.map((plan) => (
              <WorkoutPlanCard
                key={plan.planId}
                plan={plan}
                role="athlete-owner"
                onEdit={() => setEditingPlan(plan)}
                onDelete={() => setDeletingPlan(plan)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Assigned by Trainer */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t("assigned_plans")}</h2>
        <MyWorkoutPlans />
      </section>

      {/* Create/Edit Dialog */}
      <Dialog
        open={showCreateForm || !!editingPlan}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateForm(false);
            setEditingPlan(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? t("edit") : t("create")}</DialogTitle>
          </DialogHeader>
          <WorkoutPlanForm
            plan={editingPlan || undefined}
            namespace="athlete.workout_plans"
            onSuccess={() => {
              setShowCreateForm(false);
              setEditingPlan(null);
              queryClient.invalidateQueries({ queryKey: ["my-workout-plans"] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deletingPlan}
        onOpenChange={(open) => {
          if (!open) setDeletingPlan(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("delete")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("delete_confirm", {
              count: deletingPlan?.exercises.length || 0,
            })}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeletingPlan(null)}>
              {tc("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {tc("delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
