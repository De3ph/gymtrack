"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WorkoutPlan } from "@/types";

interface PlanPickerProps {
  /** Plans the signed-in user owns and can therefore edit. */
  plans: WorkoutPlan[];
  /** Currently selected plan id, or null when nothing is selected yet. */
  value: number | null;
  onChange: (planId: number) => void;
  /**
   * Exercise that is about to be added. A plan that already contains it is
   * flagged, because adding it again is legal but rarely intended.
   */
  exerciseId: number;
}

/**
 * Radio list of the user's own workout plans.
 *
 * The choice is rendered with native radio inputs rather than a custom
 * widget: arrow-key navigation, focus handling and screen-reader semantics
 * then come from the platform instead of being re-implemented here.
 */
export function PlanPicker({
  plans,
  value,
  onChange,
  exerciseId,
}: PlanPickerProps) {
  const t = useTranslations("exercise.add_to_plan");

  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">{t("plan_label")}</legend>
      {plans.map((plan) => {
        const inputId = `plan-${plan.planId}`;
        const selected = value === plan.planId;
        const containsExercise = plan.exercises.some(
          (exercise) => exercise.exerciseId === exerciseId,
        );

        return (
          <label
            key={plan.planId}
            htmlFor={inputId}
            className={cn(
              "flex cursor-pointer items-start gap-3 border border-border p-3 transition-colors hover:border-foreground/40",
              selected && "border-primary bg-primary/5",
            )}
          >
            <input
              id={inputId}
              type="radio"
              name="workout-plan"
              value={plan.planId}
              checked={selected}
              onChange={() => onChange(plan.planId)}
              // The label holds the plan's description and count as well, so
              // the radio would announce all of it. The plan's name is the
              // part that identifies the choice.
              aria-label={plan.name}
              className="mt-1 size-4 accent-primary"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">
                {plan.name}
              </span>
              {plan.description && (
                <span className="block truncate text-xs text-muted-foreground">
                  {plan.description}
                </span>
              )}
              <span className="mt-1 block text-xs text-muted-foreground">
                {t("plan_exercises_count", { count: plan.exercises.length })}
              </span>
            </span>
            {containsExercise && (
              <Badge variant="outline" className="shrink-0">
                {t("already_in_plan")}
              </Badge>
            )}
          </label>
        );
      })}
    </fieldset>
  );
}
