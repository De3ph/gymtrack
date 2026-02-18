"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { useQuery } from "@tanstack/react-query";
import { format, isSameDay } from "date-fns";
import "react-day-picker/dist/style.css";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mealApi } from "@/lib/api";
import { DailyNutritionSummary } from "./DailyNutritionSummary";

export function MealCalendar() {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    new Date(),
  );

  const { data: mealsData } = useQuery({
    queryKey: ["meals"],
    queryFn: () => mealApi.getAll(),
  });

  // Group meals by date
  const mealDays = React.useMemo(() => {
    if (!mealsData?.meals) return [];
    return mealsData.meals.map((m) => new Date(m.date));
  }, [mealsData]);

  const selectedDayMeals = React.useMemo(() => {
    if (!selectedDate || !mealsData?.meals) return [];
    return mealsData.meals.filter((m) =>
      isSameDay(new Date(m.date), selectedDate),
    );
  }, [selectedDate, mealsData]);

  return (
    <div className="space-y-6">
      {selectedDate && <DailyNutritionSummary date={selectedDate} />}

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
                meal: mealDays,
              }}
              modifiersStyles={{
                meal: {
                  fontWeight: "bold",
                  color: "var(--primary)",
                  textDecoration: "underline",
                },
              }}
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
                      {meal.mealType} - {format(new Date(meal.date), "p")}
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
