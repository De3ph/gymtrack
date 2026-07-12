"use client";

import { CombinedTrainingCalendar } from "@/components/features/dashboard/CombinedTrainingCalendar";
import { QuickActionsPanel } from "@/components/features/dashboard/QuickActionsPanel";
import {
  DashboardMetric,
  DashboardMetricSkeleton,
  DashboardShell,
} from "@/components/features/dashboard/DashboardShell";
import { mealApi, relationshipApi, workoutApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { motion, LazyMotion, domAnimation } from "motion/react";
import { staggerContainer } from "@/lib/animations";

function getWeekRange() {
  const start = dayjs().subtract(1, "week").startOf("day");
  const end = dayjs().endOf("day");

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

export function AthleteDashboardContent() {
  const t = useTranslations("dashboard");
  const tAthlete = useTranslations("athlete.dashboard");
  const weekRange = getWeekRange();

  const {
    data: workoutData,
    isFetching: workoutsFetching,
  } = useQuery({
    queryKey: [
      "dashboard-athlete-workouts",
      weekRange.startDate,
      weekRange.endDate,
    ],
    queryFn: () => workoutApi.getAll(weekRange),
  });

  const {
    data: mealData,
    isFetching: mealsFetching,
  } = useQuery({
    queryKey: [
      "dashboard-athlete-meals",
      weekRange.startDate,
      weekRange.endDate,
    ],
    queryFn: () => mealApi.getAll(weekRange),
  });

  const {
    data: trainerData,
    isFetching: trainerFetching,
  } = useQuery({
    queryKey: ["dashboard-my-trainer"],
    queryFn: relationshipApi.getMyTrainer,
  });

  const workoutsThisWeek = workoutData?.workouts?.length ?? 0;
  const mealsThisWeek = mealData?.meals?.length ?? 0;
  const activeTrainer = trainerData?.activeTrainer?.trainer;
  const metricsLoading = workoutsFetching || mealsFetching || trainerFetching;

  return (
    <DashboardShell
      eyebrow={tAthlete("eyebrow")}
      title={tAthlete("title")}
      description={tAthlete("description")}
    >
      <motion.section
        className="grid gap-4 md:grid-cols-3"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {metricsLoading ? (
          <>
            <DashboardMetricSkeleton />
            <DashboardMetricSkeleton />
            <DashboardMetricSkeleton />
          </>
        ) : (
          <>
            <DashboardMetric
              label={t("stats.workouts")}
              value={workoutsThisWeek}
              hint={tAthlete("workout_hint")}
            />
            <DashboardMetric
              label={t("stats.meals")}
              value={mealsThisWeek}
              hint={tAthlete("meal_hint")}
            />
            <DashboardMetric
              label={tAthlete("trainer")}
              value={activeTrainer ? activeTrainer.profile.name : "—"}
              hint={
                activeTrainer
                  ? tAthlete("trainer_connected")
                  : tAthlete("trainer_empty")
              }
            />
          </>
        )}
      </motion.section>

      <motion.section
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <CombinedTrainingCalendar />
      </motion.section>

      <motion.section
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <QuickActionsPanel activeTrainer={activeTrainer} />
      </motion.section>
    </DashboardShell>
  );
}
