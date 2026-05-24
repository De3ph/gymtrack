"use client";

import { Eye } from "lucide-react";
import { useState } from "react";
import { WorkoutPlan, WorkoutPlanSet } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";

interface PlanViewDialogProps {
  plan: WorkoutPlan;
  label?: string;
}

function formatSets(sets: WorkoutPlanSet[]): string {
  const count = sets.length;
  const reps = sets.map((s) => s.reps).join(",");
  return `${count} set${count > 1 ? "s" : ""}, ${reps} reps`;
}

export function PlanViewDialog({ plan, label }: PlanViewDialogProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("athlete.workout_plans");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {label ? (
          <Button type="button" variant="outline" onClick={() => setOpen(true)}>
            <Eye className="w-4 h-4 mr-1" />
            {label}
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setOpen(true)}
          >
            <Eye className="h-4 w-4" />
            <span className="sr-only">{t("view_plan")}</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{plan.name}</DialogTitle>
          {plan.description && (
            <DialogDescription>{plan.description}</DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {plan.exercises
            .sort((a, b) => a.order - b.order)
            .map((exercise) => (
              <div
                key={exercise.exerciseId}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {exercise.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatSets(exercise.sets)}
                  </p>
                </div>
                {exercise.notes && (
                  <p className="text-xs text-muted-foreground ml-3 shrink-0 max-w-[120px] text-right">
                    {exercise.notes}
                  </p>
                )}
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
