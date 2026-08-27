"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import dayjs, { formatDate } from "@/lib/i18n/dayjs";
import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { workoutApi } from "@/lib/api";
import { useCalendarStore } from "@/stores/calendar-store";
import { WorkoutExercise, ExerciseSet } from "@/types";

const CalendarGrid = dynamic(
  () => import("./CalendarGrid").then((m) => m.CalendarGrid),
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

  const { data: workoutsData, isLoading } = useQuery({
    queryKey: ["workouts"],
    queryFn: () => workoutApi.getAll(),
  });

  const workoutDays = React.useMemo(() => {
    if (!workoutsData?.workouts) return [];
    return workoutsData.workouts.map((w) => dayjs(w.date).toDate());
  }, [workoutsData]);

  const selectedDayWorkouts = React.useMemo(() => {
    if (!selectedDate || !workoutsData?.workouts) return [];
    return workoutsData.workouts.filter((w) =>
      dayjs(w.date).isSame(selectedDate, "day"),
    );
  }, [selectedDate, workoutsData]);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <CalendarGrid
        selectedDate={selectedDate}
        onSelect={(d) => {
          if (d) setSelectedDate(d);
        }}
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
        workoutDays={workoutDays}
      />

      <section className="flex flex-col border border-border">
        <header className="border-b border-border px-4 py-3 sm:px-6 sm:py-4">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {selectedDate
              ? formatDate(selectedDate, "dddd, MMMM D, YYYY")
              : t("select_date")}
          </h3>
        </header>

        <div className="flex-1 px-4 py-3 sm:px-6 sm:py-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <Spinner className="size-5" />
            </div>
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
        </div>

        <Separator />
      </section>
    </div>
  );
}
