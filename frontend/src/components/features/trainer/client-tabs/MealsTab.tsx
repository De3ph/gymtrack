"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MealList } from "@/components/features/meal/MealList";
import { useTranslations } from "next-intl";
import { Meal } from "@/types";

interface MealsTabProps {
  meals: Meal[];
}

export function MealsTab({ meals }: MealsTabProps) {
  const t = useTranslations("trainer.client_detail.tabs");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("meal_history")}</CardTitle>
        <CardDescription>{t("meal_description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {meals.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t("no_meals")}
          </p>
        ) : (
          <MealList meals={meals} readOnly={true} />
        )}
      </CardContent>
    </Card>
  );
}
