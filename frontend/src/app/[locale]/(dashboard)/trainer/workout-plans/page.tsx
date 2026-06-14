"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WorkoutPlanList } from "@/components/features/workout-plan/WorkoutPlanList";
import { WorkoutPlanForm } from "@/components/features/workout-plan/WorkoutPlanForm";
import { AssignPlanDialog } from "@/components/features/workout-plan/AssignPlanDialog";
import { WorkoutPlan } from "@/types";
import { workoutPlanApi } from "@/lib/api";
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
  const tc = useTranslations("common.actions");
  const queryClient = useQueryClient();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null);
  const [assigningPlan, setAssigningPlan] = useState<WorkoutPlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<WorkoutPlan | null>(null);
  const [planFilter, setPlanFilter] = useState("");

  const planFilterItems = [
    { value: "", label: t("all_plans") },
    { value: "active", label: t("active") },
    { value: "inactive", label: t("inactive") },
    { value: "archived", label: t("archived") },
  ];

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
      setPlanFilter(""); // Reset filter when deleting
      setDeletingPlan(null);
    } catch (e) {
      console.error(e);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["workout-plans"],
    queryFn: () => workoutPlanApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });
  const allPlans = data?.plans ?? [];

  const filteredPlans = allPlans.filter(
    (plan: WorkoutPlan) => planFilter === "" || plan.status === planFilter,
  );

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

      {/* Filter Select */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="w-full sm:w-auto sm:ml-auto">
          <Select
            items={planFilterItems}
            value={planFilter}
            onValueChange={(v: string | null) => setPlanFilter(v ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>{t("all_plans")}</SelectLabel>
                {planFilterItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

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
            onSuccess={() => {
              setShowCreateForm(false);
              setEditingPlan(null);
            }}
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

      {/* Plan List */}
      <WorkoutPlanList
        plans={filteredPlans}
        onEdit={(plan) => setEditingPlan(plan)}
        onDelete={(plan) => setDeletingPlan(plan)}
        onAssign={(plan) => setAssigningPlan(plan)}
      />
    </div>
  );
}
