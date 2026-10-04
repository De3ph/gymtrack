"use client";

import { memo } from "react";
import { useRouter } from "next/navigation";
import { WorkoutPlan } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Dumbbell, Pencil, Trash2, UserPlus } from "lucide-react";
import { PlanViewDialog } from "./PlanViewDialog";
import { useTranslations } from "next-intl";
import { ROUTES } from "@/lib/routes";

interface WorkoutPlanCardProps {
  plan: WorkoutPlan;
  role: "trainer" | "athlete-owner" | "athlete-assigned";
  onEdit?: (plan: WorkoutPlan) => void;
  onDelete?: (plan: WorkoutPlan) => void;
  onAssign?: (plan: WorkoutPlan) => void;
  onStart?: (plan: WorkoutPlan) => void;
  onView?: (plan: WorkoutPlan) => void;
}

export const WorkoutPlanCard = memo(function WorkoutPlanCardImpl({
  plan,
  role,
  onEdit,
  onDelete,
  onAssign,
  onStart,
  onView,
}: WorkoutPlanCardProps) {
  const t = useTranslations("trainer.workout_plans");
  const tAthlete = useTranslations("athlete.workout_plans");
  const router = useRouter();

  // Sends the athlete to the log-workout route with the clicked plan preloaded.
  // The page reads `?planId=` and seeds the form with the plan's exercises.
  const handleLogWorkout =
    onStart ??
    ((target: WorkoutPlan) =>
      router.push(`${ROUTES.ATHLETE_WORKOUTS}?planId=${target.planId}`));

  const isAthlete = role === "athlete-owner" || role === "athlete-assigned";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{plan.name}</CardTitle>
        {plan.description && (
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {plan.exercises.length} {tAthlete("exercises")}
        </p>

        {/*
          Action bar. The secondary actions collapse to icon-only buttons so
          the row never outgrows a 3-up grid column, and the primary CTA holds
          its place on the right via ml-auto. No flex-wrap here on purpose —
          combining wrap with an auto margin strands the CTA on its own line
          with a gap the width of the remaining row.
        */}
        <div className="mt-4 flex items-center gap-1 border-t pt-3">
          {role === "athlete-assigned" && (
            <PlanViewDialog plan={plan} />
          )}
          {role === "athlete-owner" && (
            <>
              {onView ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={() => onView(plan)}
                  title={tAthlete("view_plan")}
                >
                  <Eye className="size-4" />
                  <span className="sr-only">{tAthlete("view_plan")}</span>
                </Button>
              ) : (
                <PlanViewDialog plan={plan} />
              )}
              {onEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={() => onEdit(plan)}
                  title={tAthlete("edit")}
                >
                  <Pencil className="size-4" />
                  <span className="sr-only">{tAthlete("edit")}</span>
                </Button>
              )}
              {onDelete && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-red-600 hover:text-red-600"
                  onClick={() => onDelete(plan)}
                  title={tAthlete("delete")}
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">{tAthlete("delete")}</span>
                </Button>
              )}
            </>
          )}
          {isAthlete && (
            <Button
              size="sm"
              className="ml-auto shrink-0"
              onClick={() => handleLogWorkout(plan)}
            >
              <Dumbbell className="size-4" /> {tAthlete("log_workout")}
            </Button>
          )}
          {role === "trainer" && (
            <>
              {onView ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={() => onView(plan)}
                  title={tAthlete("view_plan")}
                >
                  <Eye className="size-4" />
                  <span className="sr-only">{tAthlete("view_plan")}</span>
                </Button>
              ) : (
                <PlanViewDialog plan={plan} />
              )}
              {onEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={() => onEdit(plan)}
                  title={t("edit")}
                >
                  <Pencil className="size-4" />
                  <span className="sr-only">{t("edit")}</span>
                </Button>
              )}
              {onAssign && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={() => onAssign(plan)}
                  title={t("assign")}
                >
                  <UserPlus className="size-4" />
                  <span className="sr-only">{t("assign")}</span>
                </Button>
              )}
              {onDelete && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-red-600 hover:text-red-600"
                  onClick={() => onDelete(plan)}
                  title={t("delete")}
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">{t("delete")}</span>
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
})
