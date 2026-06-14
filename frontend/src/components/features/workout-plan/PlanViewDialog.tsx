"use client";

import { Eye } from "lucide-react";
import { Fragment, useState } from "react";
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
import { Separator } from "@/components/ui/separator";

interface PlanViewDialogProps {
  plan: WorkoutPlan;
  label?: string;
}

function formatSets(
  t: (key: string, params?: any) => string,
  sets: WorkoutPlanSet[],
): string {
  const count = sets.length;
  const reps = sets.map((s) => s.reps).join(",");
  return t("set_format", { count, reps });
}

export function PlanViewDialog({ plan, label }: PlanViewDialogProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("athlete.workout_plans");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          label ? (
            <Button type="button" variant="outline">
              <Eye className="w-4 h-4 mr-1" />
              {label}
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <Eye className="h-4 w-4" />
              <span className="sr-only">{t("view_plan")}</span>
            </Button>
          )
        }
      />
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
              <Fragment key={exercise.exerciseId}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {exercise.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatSets(t, exercise.sets)}
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
  );
}
