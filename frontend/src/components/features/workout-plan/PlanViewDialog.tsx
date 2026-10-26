"use client";

import { Eye } from "lucide-react";
import { Fragment, useState } from "react";
import { WorkoutPlan } from "@/types";
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

export function PlanViewDialog({ plan, label }: PlanViewDialogProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("athlete.workout_plans");
  const tSetType = useTranslations("workout.set_types");

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
              <Eye className="size-5" />
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
                    <p className="text-sm font-semibold truncate">
                      {exercise.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("set_format", {
                        count: exercise.sets.length,
                        reps: exercise.sets.map((s) => s.reps).join(","),
                      })}
                    </p>
                    {exercise.sets.some(
                      (s) => s.setType && s.setType !== "working",
                    ) && (
                      <p className="text-xs text-muted-foreground">
                        {exercise.sets
                          .filter((s) => s.setType && s.setType !== "working")
                          .map((s) => `${tSetType(s.setType!)} ${s.reps}@${s.weight}${s.weightUnit}`)
                          .join(" • ")}
                      </p>
                    )}
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
