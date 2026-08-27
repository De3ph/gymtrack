"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WorkoutPlanForm } from "./WorkoutPlanForm";
import { WorkoutPlan } from "@/types";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";

interface WorkoutPlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: WorkoutPlan;
  namespace?: "trainer.workout_plans" | "athlete.workout_plans";
  onSuccess?: () => void;
}

export function WorkoutPlanFormDialog({
  open,
  onOpenChange,
  plan,
  namespace = "trainer.workout_plans",
  onSuccess,
}: WorkoutPlanFormDialogProps) {
  const t = useTranslations(namespace);
  const queryClient = useQueryClient();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl min-w-[50dvw] max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="text-lg">
            {plan ? t("edit") : t("create")}
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 py-6">
          <WorkoutPlanForm
            plan={plan}
            namespace={namespace}
            onSuccess={() => {
              if (namespace === "athlete.workout_plans") {
                queryClient.invalidateQueries({ queryKey: ["my-workout-plans"] });
              }
              if (onSuccess) onSuccess();
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
