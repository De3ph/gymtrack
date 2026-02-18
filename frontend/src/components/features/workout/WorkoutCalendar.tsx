"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { useQuery } from "@tanstack/react-query";
import { format, isSameDay } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { workoutApi } from "@/lib/api";

export function WorkoutCalendar() {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    new Date(),
  );

  const { data: workoutsData } = useQuery({
    queryKey: ["workouts"], // Simplified query key, improved with date range later
    queryFn: () => workoutApi.getAll(),
  });

  // Group workouts by date to show indicators
  const workoutDays = React.useMemo(() => {
    if (!workoutsData?.workouts) return [];
    return workoutsData.workouts.map((w) => new Date(w.date));
  }, [workoutsData]);

  const selectedDayWorkouts = React.useMemo(() => {
    if (!selectedDate || !workoutsData?.workouts) return [];
    return workoutsData.workouts.filter((w) =>
      isSameDay(new Date(w.date), selectedDate),
    );
  }, [selectedDate, workoutsData]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            modifiers={{
              workout: workoutDays,
            }}
            modifiersStyles={{
              workout: {
                fontWeight: "bold",
                color: "var(--primary)",
                textDecoration: "underline",
              }, // Simple style for now
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedDate ? format(selectedDate, "PPPP") : "Select a date"}
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
                    {format(new Date(workout.date), "p")}
                  </div>
                  <ul className="list-disc pl-5 mt-2">
                    {workout.exercises.map((ex) => (
                      <li key={ex.exerciseId || ex.name}>
                        {ex.name}: {ex.sets} sets x {ex.reps.join(",")}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              No workouts recorded for this day.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
