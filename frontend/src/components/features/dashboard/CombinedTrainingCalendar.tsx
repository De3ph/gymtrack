"use client";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { mealApi, workoutApi } from "@/lib/api";
import { Meal, Workout } from "@/types";
import dayjs from "dayjs";
import { CalendarDays, UtensilsCrossed } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardEvent, DashboardEventList } from "./DashboardEventList";

interface CombinedTrainingCalendarProps {
  startDate?: string;
  endDate?: string;
}

export function CombinedTrainingCalendar({
  startDate,
  endDate,
}: CombinedTrainingCalendarProps) {
  const t = useTranslations("dashboard.calendar");
  const tEvent = useTranslations("dashboard.calendar.events");
  const tDate = useTranslations("common.date");
  const [selectedDate, setSelectedDate] = React.useState<Date>(dayjs().toDate());

  const { data: workoutData, isLoading: workoutsLoading } = useQuery({
    queryKey: ["dashboard-workouts", startDate, endDate],
    queryFn: () => workoutApi.getAll({ startDate, endDate }),
  });

  const { data: mealData, isLoading: mealsLoading } = useQuery({
    queryKey: ["dashboard-meals", startDate, endDate],
    queryFn: () => mealApi.getAll({ startDate, endDate }),
  });

  const workouts = React.useMemo(() => workoutData?.workouts ?? [], [workoutData]);
  const meals = React.useMemo(() => mealData?.meals ?? [], [mealData]);
  const isLoading = workoutsLoading || mealsLoading;

  const selectedEvents = React.useMemo<DashboardEvent[]>(() => {
    const selectedWorkouts = workouts.filter((workout) =>
      dayjs(workout.date).isSame(selectedDate, "day"),
    );
    const selectedMeals = meals.filter((meal) =>
      dayjs(meal.date).isSame(selectedDate, "day"),
    );

    return [
      ...selectedWorkouts.map((workout) => workoutToEvent(workout, tEvent)),
      ...selectedMeals.map((meal) => mealToEvent(meal)),
    ].sort((a, b) => dayjs(a.time, "HH:mm").valueOf() - dayjs(b.time, "HH:mm").valueOf());
  }, [tEvent, workouts, meals, selectedDate]);

  const handleToday = () => {
    const today = dayjs().toDate();
    setSelectedDate(today);
  };

  if (isLoading) {
    return (
      <Card className="rounded-[1.5rem]">
        <CardHeader>
          <CardTitle>{t("loading")}</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-[1.5rem]">
      <CardHeader className="gap-1 border-b border-border pb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleToday}>
            {tDate("today")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
        <div className="flex justify-center rounded-2xl bg-muted/30 p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            modifiers={{
              workout: workouts.map((workout) => dayjs(workout.date).toDate()),
              meal: meals.map((meal) => dayjs(meal.date).toDate()),
            }}
            modifiersClassNames={{
              workout: "font-semibold text-primary after:absolute after:-bottom-0.5 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-primary",
              meal: "font-semibold text-emerald-600 after:absolute after:-bottom-0.5 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-emerald-500 dark:text-emerald-400 dark:after:bg-emerald-400",
            }}
            className="rounded-xl border bg-background"
          />
        </div>
        <div className="space-y-4 rounded-2xl bg-muted/30 p-4">
          <div className="flex flex-wrap gap-2">
            <Legend icon={<CalendarDays className="h-3.5 w-3.5" />} label={t("workout")} />
            <Legend icon={<UtensilsCrossed className="h-3.5 w-3.5" />} label={t("meal")} />
          </div>
          <DashboardEventList date={selectedDate} events={selectedEvents} />
        </div>
      </CardContent>
    </Card>
  );
}

function workoutToEvent(workout: Workout, tEvent: (key: string) => string): DashboardEvent {
  const firstExercise = workout.exercises[0];

  return {
    id: workout.workoutId,
    kind: "workout",
    title: tEvent("workout"),
    time: dayjs(workout.date).format("HH:mm"),
    detail: firstExercise
      ? `${firstExercise.name} · ${workout.exercises.length} ${tEvent("exercises")}`
      : tEvent("no_exercises"),
  };
}

function mealToEvent(meal: Meal): DashboardEvent {
  return {
    id: meal.mealId,
    kind: "meal",
    title: capitalize(meal.mealType),
    time: dayjs(meal.date).format("HH:mm"),
    detail: meal.items.map((item) => item.food).join(", "),
  };
}

function Legend({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground">
      {icon}
      {label}
    </span>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

