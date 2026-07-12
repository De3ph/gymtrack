"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { mealApi } from "@/lib/api";
import { DailyNutritionSummary } from "./DailyNutritionSummary";
import dayjs from "dayjs";
import { useTranslations } from "next-intl"

const CalendarGrid = dynamic(
  () => import("./CalendarGrid").then((m) => m.CalendarGrid),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full" /> },
);

export function MealCalendar() {
  const t = useTranslations("meal.calendar")
  const tCard = useTranslations("meal.card")
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    dayjs().toDate(),
  );

  const { data: mealsData, isLoading } = useQuery({
    queryKey: ["meals"],
    queryFn: () => mealApi.getAll(),
  });

  // Group meals by date
  const mealDays = React.useMemo(() => {
    if (!mealsData?.meals) return [];
    return mealsData.meals.map((m) => dayjs(m.date).toDate());
  }, [mealsData]);

  const selectedDayMeals = React.useMemo(() => {
    if (!selectedDate || !mealsData?.meals) return [];
    return mealsData.meals.filter((m) =>
      dayjs(m.date).isSame(selectedDate, "day"),
    );
  }, [selectedDate, mealsData]);

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <Card>
          <CardHeader>
            <CardTitle>{t("loading_meals")}</CardTitle>
          </CardHeader>
          <CardContent className='p-4 space-y-4'>
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className='h-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse'
              />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("loading_details")}</CardTitle>
          </CardHeader>
          <CardContent className='p-4 space-y-4'>
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className='h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse'
              />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {selectedDate && <DailyNutritionSummary date={dayjs(selectedDate)} />}

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <CalendarGrid
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          mealDays={mealDays}
        />

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate
                ? dayjs(selectedDate).format("MMM D, YYYY")
                : t("select_date")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDayMeals.length > 0 ? (
              <div className='space-y-4'>
                {selectedDayMeals.map((meal) => (
                  <div
                    key={meal.mealId}
                    className='border-b last:border-0 pb-2'
                  >
                    <div className='font-semibold capitalize'>
                      {meal.mealType} - {dayjs(meal.date).format("LT")}
                    </div>
                    <ul className='list-disc pl-5 mt-2 text-sm'>
                      {meal.items.map((item, idx) => (
                        <li key={idx}>
                          {item.food} ({item.quantity}) - {item.calories} {tCard('kcal')}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className='text-muted-foreground'>{t("no_meals")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
