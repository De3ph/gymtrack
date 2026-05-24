"use client";

import { WorkoutPlan } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pencil, Trash2, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";

interface WorkoutPlanCardProps {
  plan: WorkoutPlan;
  role: "trainer" | "athlete";
  onEdit?: (plan: WorkoutPlan) => void;
  onDelete?: (plan: WorkoutPlan) => void;
  onAssign?: (plan: WorkoutPlan) => void;
  onStart?: (plan: WorkoutPlan) => void;
}

export function WorkoutPlanCard({
  plan,
  role,
  onEdit,
  onDelete,
  onAssign,
  onStart,
}: WorkoutPlanCardProps) {
  const t = useTranslations("trainer.workout_plans");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{plan.name}</CardTitle>
        {plan.description && (
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {plan.exercises.length} exercises
        </p>
        <div className="flex flex-wrap gap-2">
          {role === "athlete" && onStart && (
            <Button size="sm" onClick={() => onStart(plan)}>
              <Play className="w-4 h-4 mr-1" /> Start Workout
            </Button>
          )}
          {role === "trainer" && (
            <>
              {onEdit && (
                <Button size="sm" variant="outline" onClick={() => onEdit(plan)}>
                  <Pencil className="w-4 h-4 mr-1" /> Edit
                </Button>
              )}
              {onAssign && (
                <Button size="sm" variant="outline" onClick={() => onAssign(plan)}>
                  <UserPlus className="w-4 h-4 mr-1" /> Assign
                </Button>
              )}
              {onDelete && (
                <Button size="sm" variant="outline" className="text-red-600" onClick={() => onDelete(plan)}>
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
