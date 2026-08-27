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
import { WorkoutPlanFormDialog } from "@/components/features/workout-plan/WorkoutPlanFormDialog";
import { AssignPlanDialog } from "@/components/features/workout-plan/AssignPlanDialog";
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
      await revalidateWorkoutPlansCache();
      queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
      setPlanFilter("");
      setDeletingPlan(null);
    } catch (e) {
      console.error(e);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["workout-plans"],
    queryFn: () => workoutPlanApi.getAll(),
    staleTime: STALE_TIMES.FIVE_MINUTES,
  });
  const allPlans = data?.plans ?? [];

  const filteredPlans = allPlans.filter(
    (plan: WorkoutPlan) => planFilter === "" || plan.status === planFilter,
  );

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="rounded-none font-mono text-[10px] uppercase tracking-[0.18em]"
        >
          <Plus className="size-5" aria-hidden="true" /> {t("create")}
        </Button>
      </div>

      <div className="mb-6 flex justify-end">
        <Select
          items={planFilterItems}
          value={planFilter}
          onValueChange={(v: string | null) => setPlanFilter(v ?? "")}
        >
          <SelectTrigger className="w-full rounded-none shadow-none sm:w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-none border border-border shadow-none ring-0">
            <SelectGroup>
              <SelectLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {t("all_plans")}
              </SelectLabel>
              {planFilterItems.map((item) => (
                <SelectItem
                  key={item.value}
                  value={item.value}
                  className="rounded-none font-mono text-[10px] uppercase tracking-[0.18em]"
                >
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <WorkoutPlanFormDialog
        open={showCreateForm || !!editingPlan}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateForm(false);
            setEditingPlan(null);
          }
        }}
        plan={editingPlan || undefined}
        onSuccess={() => {
          setShowCreateForm(false);
          setEditingPlan(null);
        }}
      />

      {assigningPlan && (
        <AssignPlanDialog
          planId={assigningPlan.planId}
          trigger={<span />}
          onSuccess={() => setAssigningPlan(null)}
        />
      )}

      <Dialog
        open={!!deletingPlan}
        onOpenChange={(open) => {
          if (!open) setDeletingPlan(null);
        }}
      >
        <DialogContent className="rounded-none border border-border p-0 shadow-none ring-0">
          <DialogHeader className="border-b border-border px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-6">
            <DialogTitle className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {t("delete")}
            </DialogTitle>
          </DialogHeader>
          <p className="px-4 py-3 text-sm text-muted-foreground sm:px-6 sm:py-4">
            {t("delete_confirm", {
              count: deletingPlan?.exercises.length || 0,
            })}
          </p>
          <div className="flex justify-end gap-2 border-t border-border px-4 py-3 sm:px-6">
            <Button
              variant="outline"
              onClick={() => setDeletingPlan(null)}
              className="rounded-none font-mono text-[10px] uppercase tracking-[0.18em]"
            >
              {tc("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="rounded-none font-mono text-[10px] uppercase tracking-[0.18em]"
            >
              {tc("delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <WorkoutPlanList
        plans={filteredPlans}
        onEdit={(plan) => setEditingPlan(plan)}
        onDelete={(plan) => setDeletingPlan(plan)}
        onAssign={(plan) => setAssigningPlan(plan)}
      />
    </div>
  );
}
