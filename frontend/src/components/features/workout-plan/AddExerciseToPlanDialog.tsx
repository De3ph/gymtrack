"use client";

import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ArrowLeft, ListPlus, Loader2 } from "lucide-react";

import { workoutPlanApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { ExerciseLibrary, WorkoutPlanSet } from "@/types";
import { PlanPicker } from "./PlanPicker";
import { PlanSetInput } from "./PlanSetInput";
import { useAddExerciseToPlan } from "./useAddExerciseToPlan";

/** The fields of an exercise this flow needs. Narrower on purpose. */
export type PlanExercise = Pick<ExerciseLibrary, "exerciseId" | "name">;

interface AddExerciseToPlanDialogProps {
  exercise: PlanExercise;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where the user creates their first plan when they have none. */
  createPlanHref: string;
}

/** A first set to pre-fill the editor with, so the form is never empty. */
function initialSets(): WorkoutPlanSet[] {
  return [{ setType: "working", weight: 0, weightUnit: "kg", reps: 10, restTime: 60 }];
}

type Step = "plan" | "sets";

/**
 * Two-step "add this exercise to one of my plans" flow.
 *
 * The plan is picked first because it decides where the exercise lands, and
 * the sets are configured second because they are the part the user actually
 * has to think about. Each step is a separate view rather than one long
 * scroll, so the dialog stays readable on a phone.
 */
export function AddExerciseToPlanDialog({
  exercise,
  open,
  onOpenChange,
  createPlanHref,
}: AddExerciseToPlanDialogProps) {
  const t = useTranslations("exercise.add_to_plan");
  const tCommon = useTranslations("common.actions");

  const [step, setStep] = useState<Step>("plan");
  const [planId, setPlanId] = useState<number | null>(null);
  const [sets, setSets] = useState<WorkoutPlanSet[]>(initialSets);

  const {
    data: plansData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    // The user can only edit plans they created, which is exactly what this
    // endpoint returns.
    queryKey: qk.plans.own,
    queryFn: () => workoutPlanApi.getAll(),
    enabled: open,
    // The picker is where a plan is chosen, so it has to show the plans that
    // exist now: a plan created in another tab must not be missing from the
    // list. The shared plan list is served from a five minute cache, so this
    // observer reads the server instead.
    staleTime: 0,
    refetchOnMount: "always",
  });

  const plans = plansData?.plans ?? [];
  const selectedPlan = plans.find((plan) => plan.planId === planId) ?? null;

  const { mutate: addToPlan, isPending } = useAddExerciseToPlan();

  const handleOpenChange = useCallback(
    (next: boolean) => {
      onOpenChange(next);
      // Reset on close so the next open starts from the plan step again.
      if (!next) {
        setStep("plan");
        setPlanId(null);
        setSets(initialSets());
      }
    },
    [onOpenChange],
  );

  const handleSubmit = () => {
    if (!selectedPlan) return;
    addToPlan(
      { planId: selectedPlan.planId, exercise, sets },
      { onSuccess: () => handleOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title", { name: exercise.name })}</DialogTitle>
          <DialogDescription>
            {step === "plan" ? t("description_plan") : t("description_sets")}
          </DialogDescription>
        </DialogHeader>

        {step === "plan" ? (
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : isError ? (
              <div className="flex justify-center py-8">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                >
                  {tCommon("retry")}
                </Button>
              </div>
            ) : plans.length === 0 ? (
              <Empty className="rounded-none border border-border p-8">
                <EmptyHeader>
                  <EmptyTitle className="font-mono text-base uppercase tracking-[0.18em]">
                    {t("no_plans")}
                  </EmptyTitle>
                </EmptyHeader>
                <Link
                  href={createPlanHref}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "rounded-none font-mono text-[10px] uppercase tracking-[0.18em]",
                  )}
                >
                  {t("create_plan")}
                </Link>
              </Empty>
            ) : (
              <PlanPicker
                plans={plans}
                value={planId}
                onChange={setPlanId}
                exerciseId={exercise.exerciseId}
              />
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {t("plan_label")}: {selectedPlan?.name}
            </p>
            <PlanSetInput value={sets} onChange={setSets} />
          </div>
        )}

        <DialogFooter>
          {step === "sets" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("plan")}
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
              {tCommon("back")}
            </Button>
          )}
          {step === "plan" ? (
            <Button
              type="button"
              disabled={!selectedPlan}
              onClick={() => setStep("sets")}
            >
              {tCommon("next")}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={isPending || !selectedPlan}
              onClick={handleSubmit}
            >
              {isPending ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <ListPlus className="size-5" aria-hidden="true" />
              )}
              {isPending ? t("adding") : t("add")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
