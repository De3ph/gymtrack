"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isSameDay } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mealApi } from "@/lib/api";

interface DailyNutritionSummaryProps {
  date: Date;
}

export function DailyNutritionSummary({ date }: DailyNutritionSummaryProps) {
  const { data } = useQuery({
    queryKey: ["meals"],
    queryFn: () => mealApi.getAll(),
  });

  const dailyMeals = React.useMemo(() => {
    if (!data?.meals) return [];
    return data.meals.filter((m) => isSameDay(new Date(m.date), date));
  }, [data, date]);

  const totals = React.useMemo(() => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fats = 0;

    dailyMeals.forEach((meal) => {
      meal.items.forEach((item) => {
        calories += item.calories || 0;
        protein += item.macros?.protein || 0;
        carbs += item.macros?.carbs || 0;
        fats += item.macros?.fats || 0;
      });
    });

    return { calories, protein, carbs, fats };
  }, [dailyMeals]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nutrition Summary for {format(date, "PPP")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{totals.calories}</div>
            <div className="text-sm text-muted-foreground">Calories</div>
          </div>
          <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold">{totals.protein}g</div>
            <div className="text-sm text-muted-foreground">Protein</div>
          </div>
          <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold">{totals.carbs}g</div>
            <div className="text-sm text-muted-foreground">Carbs</div>
          </div>
          <div className="p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
            <div className="text-2xl font-bold">{totals.fats}g</div>
            <div className="text-sm text-muted-foreground">Fats</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
