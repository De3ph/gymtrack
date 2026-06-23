"use client";

import { Skeleton } from "@/components/ui/skeleton";
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

function getMonthRange(date: Date) {
  return {
    startDate: dayjs(date).startOf("month").toISOString(),
    endDate: dayjs(date).endOf("month").toISOString(),
  };
}

export function CombinedTrainingCalendar(_props: CombinedTrainingCalendarProps) {
  const t = useTranslations("dashboard.calendar");
  const tEvent = useTranslations("dashboard.calendar.events");
  const tDate = useTranslations("common.date");
  const [selectedDate, setSelectedDate] = React.useState<Date>(dayjs().toDate());
  const [viewMonth, setViewMonth] = React.useState<Date>(dayjs().toDate());

  const monthRange = React.useMemo(() => getMonthRange(viewMonth), [viewMonth]);

  const {
    data: workoutData,
    isLoading: workoutsLoading,
    isRefetching: workoutsRefetching,
  } = useQuery({
    queryKey: ["dashboard-workouts", monthRange.startDate, monthRange.endDate],
    queryFn: () => workoutApi.getAll(monthRange),
  });

  const {
    data: mealData,
    isLoading: mealsLoading,
    isRefetching: mealsRefetching,
  } = useQuery({
    queryKey: ["dashboard-meals", monthRange.startDate, monthRange.endDate],
    queryFn: () => mealApi.getAll(monthRange),
  });

  const workouts = React.useMemo(() => workoutData?.workouts ?? [], [workoutData]);
  const meals = React.useMemo(() => mealData?.meals ?? [], [mealData]);
  const isLoading = workoutsLoading || mealsLoading;
  const isRefetching = workoutsRefetching || mealsRefetching;

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
    setViewMonth(today);
  };

  if (isLoading) {
    return <CalendarSkeleton />;
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
            month={viewMonth}
            onMonthChange={setViewMonth}
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
          <div className="max-h-[500px] overflow-y-auto scrollbar-thin">
            {isRefetching ? (
              <EventsSkeleton />
            ) : (
              <DashboardEventList date={selectedDate} events={selectedEvents} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CalendarSkeleton() {
  return (
    <Card className="overflow-hidden rounded-[1.5rem]">
      <CardHeader className="gap-1 border-b border-border pb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
          </div>
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
        <div className="flex justify-center rounded-2xl bg-muted/30 p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <div className="flex gap-1">
                <Skeleton className="size-8 rounded-md" />
                <Skeleton className="size-8 rounded-md" />
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-md" />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4 rounded-2xl bg-muted/30 p-4">
          <div className="flex gap-2">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
          <EventsSkeleton />
        </div>
      </CardContent>
    </Card>
  );
}

function EventsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4">
          <Skeleton className="size-10 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-44" />
          </div>
        </div>
      ))}
    </div>
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
