"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import dynamic from "next/dynamic";
import { mealApi, workoutApi } from "@/lib/api";
import { markerStyles } from "@/components/ui/calendar-grid";
import { Meal, Workout } from "@/types";
import dayjs from "dayjs";
import { formatDate } from "@/lib/i18n/dayjs";
import { CalendarDays, UtensilsCrossed } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardEvent, DashboardEventList } from "./DashboardEventList";

const CalendarGrid = dynamic(
  () => import("@/components/ui/calendar-grid").then((m) => m.CalendarGrid),
  { ssr: false, loading: () => <Skeleton className="h-[350px] w-full rounded-none" /> },
);

function getMonthRange(date: Date) {
  return {
    startDate: dayjs(date).startOf("month").toISOString(),
    endDate: dayjs(date).endOf("month").toISOString(),
  };
}

export function CombinedTrainingCalendar() {
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
  const workoutDates = React.useMemo(() => workouts.map((w) => dayjs(w.date).toDate()), [workouts]);
  const mealDates = React.useMemo(() => meals.map((m) => dayjs(m.date).toDate()), [meals]);

  const markers = React.useMemo(
    () => [
      { name: "workout", dates: workoutDates, className: markerStyles.workoutDot },
      { name: "meal", dates: mealDates, className: markerStyles.mealDot },
    ],
    [workoutDates, mealDates],
  );

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

  const handleToday = React.useCallback(() => {
    const today = dayjs().toDate();
    setSelectedDate(today);
    setViewMonth(today);
  }, []);

  if (isLoading) {
    return <CalendarSkeleton />;
  }

  return (
    <div className="border border-border bg-card">
      <header className="flex flex-col gap-4 border-b border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="space-y-1">
          <h2 className="font-sans text-base font-semibold leading-tight text-foreground">
            {t("title")}
          </h2>
          <p className="font-sans text-sm leading-6 text-muted-foreground">{t("description")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleToday}
          className="rounded-none font-mono text-xs uppercase tracking-[0.18em]"
        >
          {tDate("today")}
        </Button>
      </header>
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)] lg:divide-x lg:divide-border">
        <div className="p-6">
          <CalendarGrid
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            month={viewMonth}
            onMonthChange={setViewMonth}
            markers={markers}
            calendarClassName="border-0 bg-background"
          />
        </div>
        <div className="space-y-4 border-t border-border p-6 lg:border-t-0">
          <div className="flex flex-wrap gap-2">
            <Legend icon={<CalendarDays className="size-5" aria-hidden="true" />} label={t("workout")} />
            <Legend icon={<UtensilsCrossed className="size-5" aria-hidden="true" />} label={t("meal")} />
          </div>
          <Separator />
          <div className="max-h-[500px] overflow-y-auto">
            {isRefetching ? (
              <EventsSkeleton />
            ) : (
              <DashboardEventList date={selectedDate} events={selectedEvents} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="border border-border bg-card">
      <header className="flex flex-col gap-2 border-b border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40 rounded-none" />
          <Skeleton className="h-4 w-60 rounded-none" />
        </div>
        <Skeleton className="h-8 w-20 rounded-none" />
      </header>
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)] lg:divide-x lg:divide-border">
        <div className="p-6">
          <div className="space-y-3 border border-border p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32 rounded-none" />
              <div className="flex gap-1">
                <Skeleton className="size-8 rounded-none" />
                <Skeleton className="size-8 rounded-none" />
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-none" />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4 p-6">
          <div className="flex gap-2">
            <Skeleton className="h-7 w-20 rounded-none" />
            <Skeleton className="h-7 w-16 rounded-none" />
          </div>
          <EventsSkeleton />
        </div>
      </div>
    </div>
  );
}

function EventsSkeleton() {
  return (
    <div className="space-y-0 divide-y divide-border border border-border">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-start gap-4 p-4">
          <Skeleton className="size-8 shrink-0 rounded-none" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-28 rounded-none" />
              <Skeleton className="h-5 w-12 rounded-none" />
            </div>
            <Skeleton className="h-3.5 w-44 rounded-none" />
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
    time: formatDate(new Date(workout.date), "HH:mm"),
    detail: firstExercise
      ? `${firstExercise.name} · ${workout.exercises.length} ${tEvent("exercises")}`
      : tEvent("no_exercises"),
  };
}

function mealToEvent(meal: Meal): DashboardEvent {
  return {
    id: meal.mealId ?? 0,
    kind: "meal",
    title: capitalize(meal.mealType),
    time: formatDate(new Date(meal.date), "HH:mm"),
    detail: meal.items.map((item) => item.food).join(", "),
  };
}

function Legend({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 border border-border bg-background px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
      {icon}
      {label}
    </span>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
