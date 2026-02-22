"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mealApi } from "@/lib/api";
import { DailyNutritionSummary } from "./DailyNutritionSummary";
import dayjs from "dayjs";

export function MealCalendar() {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    dayjs().toDate(),
  );

  const { data: mealsData } = useQuery({
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

  return (
    <div className="space-y-6">
      {selectedDate && <DailyNutritionSummary date={dayjs(selectedDate)} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={{
                meal: mealDays.map((d) => dayjs(d).toDate()),
              }}
              modifiersClassNames={{
                meal: "font-bold text-primary underline",
              }}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate ? format(selectedDate, "PPP") : "Select a date"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDayMeals.length > 0 ? (
              <div className="space-y-4">
                {selectedDayMeals.map((meal) => (
                  <div
                    key={meal.mealId}
                    className="border-b last:border-0 pb-2"
                  >
                    <div className="font-semibold capitalize">
                      {meal.mealType} - {format(dayjs(meal.date).toDate(), "p")}
                    </div>
                    <ul className="list-disc pl-5 mt-2 text-sm">
                      {meal.items.map((item, idx) => (
                        <li key={idx}>
                          {item.food} ({item.quantity}) - {item.calories} kcal
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                No meals recorded for this day.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
