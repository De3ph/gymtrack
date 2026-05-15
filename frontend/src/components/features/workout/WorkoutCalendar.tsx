"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { workoutApi } from "@/lib/api";
import { Workout, WorkoutExercise, ExerciseSet } from "@/types";

export function WorkoutCalendar() {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    dayjs().toDate(),
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
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            modifiers={{
              workout: workoutDays,
            }}
            modifiersClassNames={{
              workout: "font-bold text-primary underline",
            }}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedDate ? dayjs(selectedDate).format("dddd, MMMM D, YYYY") : t("select_date")}
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
                        {ex.name}: {ex.sets && ex.sets.length > 0 ?
                          `${ex.sets.length} ${tList("sets_x")} ${ex.sets.map((set: ExerciseSet) => tList("set_detail", { reps: set.reps, weight: set.weight, unit: set.weightUnit || "kg" })).join(", ")}` :
                          tList("no_sets")
                        }
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              {t("no_workouts")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
