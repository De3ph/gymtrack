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
    <div className="rounded-none border border-border">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("meal_history")}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t("meal_description")}</p>
      </div>
      <div className="p-6">
        {meals.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t("no_meals")}
          </p>
        ) : (
          <MealList meals={meals} />
        )}
      </div>
    </div>
  );
}
