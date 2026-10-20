"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ListPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";
import { AddExerciseToPlanDialog, type PlanExercise } from "./AddExerciseToPlanDialog";

interface AddExerciseToPlanButtonProps {
  exercise: PlanExercise;
  /** Role of the signed-in user. */
  role: UserRole;
  className?: string;
}

/** Where a user creates a plan when they have none yet. */
function planWorkspaceHref(role: UserRole): string {
  return role === "trainer"
    ? ROUTES.TRAINER_WORKOUT_PLANS
    : ROUTES.ATHLETE_WORKOUT_PLANS;
}

/**
 * "Add to plan" action for a single exercise.
 *
 * Only trainers and athletes own workout plans — the backend rejects plan
 * creation and plan updates for any other role — so the action is hidden for
 * admins instead of opening a dialog that could only fail.
 */
export function AddExerciseToPlanButton({
  exercise,
  role,
  className,
}: AddExerciseToPlanButtonProps) {
  const t = useTranslations("exercise.add_to_plan");
  const [open, setOpen] = useState(false);

  if (role === "admin") return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn(
          "rounded-none font-mono text-[10px] uppercase tracking-[0.18em]",
          className,
        )}
        onClick={() => setOpen(true)}
      >
        <ListPlus className="size-5" aria-hidden="true" />
        {t("button")}
      </Button>
      <AddExerciseToPlanDialog
        exercise={exercise}
        open={open}
        onOpenChange={setOpen}
        createPlanHref={planWorkspaceHref(role)}
      />
    </>
  );
}
