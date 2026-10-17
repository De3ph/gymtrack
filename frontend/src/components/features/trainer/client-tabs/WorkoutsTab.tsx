"use client";

import { WorkoutList } from "@/components/features/workout/WorkoutList";
import { useTranslations } from "next-intl";
import { Workout } from "@/types";

interface WorkoutsTabProps {
  workouts: Workout[];
}

export function WorkoutsTab({ workouts }: WorkoutsTabProps) {
  const t = useTranslations("trainer.client_detail.tabs");

  return (
    <div className="rounded-none border border-border">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("workout_history")}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t("workout_description")}</p>
      </div>
      <div className="p-6">
        {workouts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t("no_workouts")}
          </p>
        ) : (
          <WorkoutList workouts={workouts} />
        )}
      </div>
    </div>
  );
}
