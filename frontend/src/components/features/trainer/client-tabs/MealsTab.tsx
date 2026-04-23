"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MealList } from "@/components/features/meal/MealList";

interface MealsTabProps {
  meals: any[];
}

export function MealsTab({ meals }: MealsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Meal History</CardTitle>
        <CardDescription>View all meals logged by this athlete</CardDescription>
      </CardHeader>
      <CardContent>
        {meals.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No meals found</p>
        ) : (
          <MealList meals={meals} readOnly={true} />
        )}
      </CardContent>
    </Card>
  );
}
