"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { workoutApi } from "@/lib/api";
import { WorkoutExercise, ExerciseSet } from "@/types";

const CalendarGrid = dynamic(
  () => import("./CalendarGrid").then((m) => m.CalendarGrid),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full" /> },
);

export function WorkoutCalendar() {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    dayjs().toDate(),
  );
  const [currentMonth, setCurrentMonth] = React.useState<Date>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );

  const t = useTranslations("workout.calendar");
  const tList = useTranslations("workout.list");

  const { data: workoutsData } = useQuery({
    queryKey: ["workouts"],
    queryFn: () => workoutApi.getAll(),
  });

  // Group workouts by date to show indicators
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <CalendarGrid
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
        workoutDays={workoutDays}
      />

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedDate
              ? dayjs(selectedDate).format("dddd, MMMM D, YYYY")
              : t("select_date")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDayWorkouts.length > 0 ? (
            <div className="space-y-4">
              {selectedDayWorkouts.map((workout) => (
                <div
                  key={workout.workoutId}
                  className="border-b last:border-0 pb-2"
                >
                  <div className="font-semibold">
                    {dayjs(workout.date).format("h:mm A")}
                  </div>
                  <ul className="list-disc pl-5 mt-2">
                    {workout.exercises.map((ex: WorkoutExercise) => (
                      <li key={ex.exerciseId || ex.name}>
                        {ex.name}:{" "}
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
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">{t("no_workouts")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
