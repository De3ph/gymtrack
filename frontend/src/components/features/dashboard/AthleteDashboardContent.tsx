"use client";

import { CombinedTrainingCalendar } from "@/components/features/dashboard/CombinedTrainingCalendar";
import { QuickActionsPanel } from "@/components/features/dashboard/QuickActionsPanel";
import {
  DashboardMetric,
  DashboardMetricSkeleton,
  DashboardShell,
} from "@/components/features/dashboard/DashboardShell";
import { mealApi, relationshipApi, workoutApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { ApiErrorHandler } from "@/lib/error-handler";
import { DataError } from "@/components/features/DataError";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { staggerContainer } from "@/lib/animations";

function getWeekRange() {
  // Quantized to day boundaries so the key is stable for the whole day:
  // different ms values at render time would otherwise fragment the cache.
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
    error: workoutError,
    refetch: refetchWorkouts,
    isFetching: workoutsFetching,
  } = useQuery({
    queryKey: qk.workouts.dashboard(weekRange),
    queryFn: () => workoutApi.getAll(weekRange),
  });

  const {
    data: mealData,
    error: mealError,
    refetch: refetchMeals,
    isFetching: mealsFetching,
  } = useQuery({
    queryKey: qk.meals.dashboard(weekRange),
    queryFn: () => mealApi.getAll(weekRange),
  });

  const {
    data: trainerData,
    error: trainerError,
    refetch: refetchTrainer,
    isFetching: trainerFetching,
  } = useQuery({
    queryKey: qk.myTrainer.dashboard,
    queryFn: relationshipApi.getMyTrainer,
  });

  const workoutsThisWeek = workoutData?.workouts?.length ?? 0;
  const mealsThisWeek = mealData?.meals?.length ?? 0;
  const activeTrainer = trainerData?.activeTrainer?.trainer;
  const metricsLoading = workoutsFetching || mealsFetching || trainerFetching;
  const metricsError = [workoutError, mealError, trainerError].find(Boolean);
  const refetchAll = () => {
    if (workoutError) refetchWorkouts();
    if (mealError) refetchMeals();
    if (trainerError) refetchTrainer();
  };

  return (
    <DashboardShell
      eyebrow={tAthlete("eyebrow")}
      title={tAthlete("title")}
      description={tAthlete("description")}
    >

      <motion.section
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <QuickActionsPanel />
      </motion.section>

      <motion.section
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <CombinedTrainingCalendar />
      </motion.section>

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
        ) : metricsError ? (
          <div className="md:col-span-3">
            <DataError
              message={ApiErrorHandler.handle(metricsError)}
              onRetry={refetchAll}
            />
          </div>
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
              value={activeTrainer?.profile?.name ?? "—"}
              hint={
                activeTrainer
                  ? tAthlete("trainer_connected")
                  : tAthlete("trainer_empty")
              }
            />
          </>
        )}
      </motion.section>


    </DashboardShell>
  );
}
