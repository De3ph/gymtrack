"use client";

import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WorkoutPlanList } from "@/components/features/workout-plan/WorkoutPlanList";
import { WorkoutPlanForm } from "@/components/features/workout-plan/WorkoutPlanForm";
import { AssignPlanDialog } from "@/components/features/workout-plan/AssignPlanDialog";
import { WorkoutPlan } from "@/types";
import { workoutPlanApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function TrainerWorkoutPlansPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const t = useTranslations("trainer.workout_plans");
  const queryClient = useQueryClient();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null);
  const [assigningPlan, setAssigningPlan] = useState<WorkoutPlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<WorkoutPlan | null>(null);

  useEffect(() => {
    if (user && user.role !== "trainer") {
      router.push(ROUTES.HOME);
    }
  }, [user, router]);

  const handleDelete = async () => {
    if (!deletingPlan) return;
    try {
      await workoutPlanApi.delete(deletingPlan.planId);
      queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
      setDeletingPlan(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="mr-2 h-4 w-4" /> {t("create")}
        </Button>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateForm || !!editingPlan} onOpenChange={(open) => {
        if (!open) { setShowCreateForm(false); setEditingPlan(null); }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? t("edit") : t("create")}</DialogTitle>
          </DialogHeader>
          <WorkoutPlanForm
            plan={editingPlan || undefined}
            onSuccess={() => { setShowCreateForm(false); setEditingPlan(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      {assigningPlan && (
        <AssignPlanDialog
          planId={assigningPlan.planId}
          trigger={<span />}
          onSuccess={() => setAssigningPlan(null)}
        />
      )}

      {/* Delete Confirmation */}
      <Dialog open={!!deletingPlan} onOpenChange={(open) => { if (!open) setDeletingPlan(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("delete")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("delete_confirm", { count: deletingPlan?.exercises.length || 0 })}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeletingPlan(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Plan List */}
      <WorkoutPlanList
        onEdit={(plan) => setEditingPlan(plan)}
        onDelete={(plan) => setDeletingPlan(plan)}
        onAssign={(plan) => setAssigningPlan(plan)}
      />
    </div>
  );
}
