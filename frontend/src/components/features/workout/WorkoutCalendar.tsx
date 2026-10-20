"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import dayjs, { formatDate } from "@/lib/i18n/dayjs";
import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { workoutApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { ApiErrorHandler } from "@/lib/error-handler";
import { DataError } from "@/components/features/DataError";
import { markerStyles } from "@/components/ui/calendar-grid";
import { useCalendarStore } from "@/stores/calendar-store";
import { WorkoutExercise, ExerciseSet } from "@/types";

const CalendarGrid = dynamic(
  () => import("@/components/ui/calendar-grid").then((m) => m.CalendarGrid),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full" /> },
);

export function WorkoutCalendar() {
  const {
    activeDate: selectedDate,
    viewMonth: currentMonth,
    setActiveDate: setSelectedDate,
    setViewMonth: setCurrentMonth,
  } = useCalendarStore();

  const t = useTranslations("workout.calendar");
  const tList = useTranslations("workout.list");
  const tDate = useTranslations("common.date");
  const reduce = useReducedMotion();

  const { data: workoutsData, isLoading, error, refetch } = useQuery({
    queryKey: qk.workouts.calendar,
    queryFn: () => workoutApi.getAll(),
  });

  const workoutDays = React.useMemo(() => {
    if (!workoutsData?.workouts) return [];
    return workoutsData.workouts.map((w) => dayjs(w.date).toDate());
  }, [workoutsData]);

  const workoutMarkers = React.useMemo(
    () => [
      { name: "workout", dates: workoutDays, className: markerStyles.workoutUnderline },
    ],
    [workoutDays],
  );

  const selectedDayWorkouts = React.useMemo(() => {
    if (!selectedDate || !workoutsData?.workouts) return [];
    return workoutsData.workouts.filter((w) =>
      dayjs(w.date).isSame(selectedDate, "day"),
    );
  }, [selectedDate, workoutsData]);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <CalendarGrid
        selected={selectedDate}
        onSelect={(d) => {
          if (d) setSelectedDate(d);
        }}
        month={currentMonth}
        onMonthChange={setCurrentMonth}
        markers={workoutMarkers}
        title={t("title")}
        showTodayAction
        todayLabel={tDate("today")}
        calendarClassName="border border-border [--cell-radius:0]"
      />

      <section className="flex flex-col border border-border">
        <header className="border-b border-border px-4 py-3 sm:px-6 sm:py-4">
          {selectedDate ? (
            <h3 className="text-base font-semibold text-foreground">
              {formatDate(selectedDate, "dddd, MMMM D, YYYY")}
            </h3>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("select_date")}
            </p>
          )}
        </header>

        <div className="flex-1 px-4 py-3 sm:px-6 sm:py-4">
          {/* Switching days swaps the whole day panel, so it crossfades
              instead of teleporting. Opacity only. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={selectedDate ? selectedDate.toISOString() : "no-date"}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.1, ease: "easeOut" }}
            >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <Spinner className="size-5" />
            </div>
          ) : error ? (
            <DataError
              message={ApiErrorHandler.handle(error)}
              onRetry={() => refetch()}
            />
          ) : selectedDayWorkouts.length > 0 ? (
            <ul className="divide-y divide-border">
              {selectedDayWorkouts.map((workout) => (
                <li
                  key={workout.workoutId}
                  className="space-y-2 py-3 first:pt-0 last:pb-0"
                >
                  <div className="font-mono text-sm tracking-tight text-foreground">
                    {formatDate(workout.date, "h:mm A")}
                  </div>
                  <ul className="space-y-1 pl-3">
                    {workout.exercises.map((ex: WorkoutExercise) => (
                      <li
                        key={ex.exerciseId || ex.name}
                        className="border-l border-border pl-3 text-sm text-muted-foreground"
                      >
                        <span className="font-semibold text-foreground">
                          {ex.name}
                        </span>
                        {": "}
                        {ex.sets && ex.sets.length > 0
                          ? tList("sets_x", { sets: ex.sets.length }) +
                            " " +
                            ex.sets
                              .map((set: ExerciseSet) =>
                                tList("set_detail", {
                                  reps: set.reps,
                                  weight: set.weight,
                                  unit: set.weightUnit || "kg",
                                }),
                              )
                              .join(", ")
                          : tList("no_sets")}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {t("no_workouts")}
            </p>
          )}
            </motion.div>
          </AnimatePresence>
        </div>

      </section>
    </div>
  );
}
