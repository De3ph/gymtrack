"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { mealApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { ApiErrorHandler } from "@/lib/error-handler";
import { DataError } from "@/components/features/DataError";
import { markerStyles } from "@/components/ui/calendar-grid";
import { useCalendarStore } from "@/stores/calendar-store";
import { DailyNutritionSummary } from "./DailyNutritionSummary";
import dayjs from "dayjs";
import { useTranslations } from "next-intl"

const CalendarGrid = dynamic(
  () => import("@/components/ui/calendar-grid").then((m) => m.CalendarGrid),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full rounded-none" /> },
);

export function MealCalendar() {
  const t = useTranslations("meal.calendar")
  const tCard = useTranslations("meal.card")
  const { activeDate: selectedDate, setActiveDate: setSelectedDate } =
    useCalendarStore();

  const { data: mealsData, isLoading, error, refetch } = useQuery({
    queryKey: qk.meals.calendar,
    queryFn: () => mealApi.getAll(),
  });

  // Group meals by date
  const mealDays = React.useMemo(() => {
    if (!mealsData?.meals) return [];
    return mealsData.meals.map((m) => dayjs(m.date).toDate());
  }, [mealsData]);

  const mealMarkers = React.useMemo(
    () => [{ name: "meal", dates: mealDays, className: markerStyles.mealUnderline }],
    [mealDays],
  );

  const selectedDayMeals = React.useMemo(() => {
    if (!selectedDate || !mealsData?.meals) return [];
    return mealsData.meals.filter((m) =>
      dayjs(m.date).isSame(selectedDate, "day"),
    );
  }, [selectedDate, mealsData]);

  if (error) {
    return (
      <DataError
        message={ApiErrorHandler.handle(error)}
        onRetry={() => refetch()}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="border border-border">
          <header className="border-b border-border px-6 py-4">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{t("loading_meals")}</h3>
          </header>
          <div className="space-y-4 p-6">
            {[...Array(2)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-48 w-full rounded-none"
              />
            ))}
          </div>
        </div>
        <div className="border border-border">
          <header className="border-b border-border px-6 py-4">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{t("loading_details")}</h3>
          </header>
          <div className="space-y-4 p-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-12 w-full rounded-none"
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {selectedDate && <DailyNutritionSummary date={dayjs(selectedDate)} />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CalendarGrid
          selected={selectedDate}
          onSelect={(d) => {
            if (d) setSelectedDate(d);
          }}
          markers={mealMarkers}
          title={t("title")}
          calendarClassName="rounded-none border border-border"
        />

        <div className="border border-border">
          <header className="border-b border-border px-6 py-4">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {selectedDate
                ? dayjs(selectedDate).format("MMM D, YYYY")
                : t("select_date")}
            </h3>
          </header>
          <div className="p-6">
            {selectedDayMeals.length > 0 ? (
              <ul className="divide-y divide-border">
                {selectedDayMeals.map((meal) => (
                  <li
                    key={meal.mealId}
                    className="py-3 first:pt-0 last:pb-0"
                  >
                    <div className="font-mono text-xs uppercase tracking-[0.18em] text-foreground capitalize">
                      {meal.mealType} · {dayjs(meal.date).format("HH:mm")}
                    </div>
                    <ul className="mt-2 space-y-1">
                      {meal.items.map((item, idx) => (
                        <li key={idx} className="flex items-baseline gap-2 font-mono text-xs leading-6 text-muted-foreground">
                          <span className="text-foreground">{item.food}</span>
                          <span>({item.quantity})</span>
                          <span className="ml-auto tabular-nums">{item.calories} {tCard('kcal')}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-mono text-xs leading-6 text-muted-foreground">{t("no_meals")}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
