"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WorkoutList } from "@/components/features/workout/WorkoutList";
import { useTranslations } from "next-intl";
import { Workout } from "@/types";

interface WorkoutsTabProps {
  workouts: Workout[];
}

export function WorkoutsTab({ workouts }: WorkoutsTabProps) {
  const t = useTranslations("trainer.client_detail.tabs");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("workout_history")}</CardTitle>
        <CardDescription>{t("workout_description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {workouts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t("no_workouts")}
          </p>
        ) : (
          <WorkoutList workouts={workouts} readOnly={true} />
        )}
      </CardContent>
    </Card>
  );
}
