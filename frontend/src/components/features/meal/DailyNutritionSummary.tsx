"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mealApi } from "@/lib/api";
import { withTiming } from "@/lib/performance";
import { formatDate } from "@/lib/i18n/dayjs";
import { API, DATE_FORMATS } from "@/lib/constants";

interface DailyNutritionSummaryProps {
  date: dayjs.Dayjs
}

export function DailyNutritionSummary({ date }: DailyNutritionSummaryProps) {
  const t = useTranslations("meal");
  const dateStr = formatDate(date, DATE_FORMATS.DATE_ONLY);

  const { data, isLoading } = useQuery({
    queryKey: ["meals", dateStr],
    queryFn: () =>
      withTiming("daily-meals-fetch", () =>
        mealApi.getByDate(dateStr, { timeout: API.DEFAULT_TIMEOUT_MS })
      )
  })

  const totals = React.useMemo(() => {
    let calories = 0
    let protein = 0
    let carbs = 0
    let fats = 0

    data?.meals?.forEach((meal) => {
      meal.items.forEach((item) => {
        calories += item.calories || 0
        protein += item.macros?.protein || 0
        carbs += item.macros?.carbs || 0
        fats += item.macros?.fats || 0
      })
    })

    return { calories, protein, carbs, fats }
  }, [data])

  const formatNumber = (value: number) => value.toLocaleString()

  // Show skeleton while loading
  if (isLoading) {
    return (
      <Card className="bg-card text-card-foreground">
        <CardHeader>
          <CardTitle className="text-xl font-extrabold">
            {t("summary.loading_title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(4)].map((_, index) => (
            <div
              key={index}
              className="h-10 animate-pulse rounded-lg bg-muted"
            />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card text-card-foreground">
      <CardHeader className="gap-2">
        <CardTitle className="font-heading text-2xl font-extrabold tracking-tight sm:text-[2.5rem]">
          {t("summary.title_with_date", { date: formatDate(date, "MMMM D, YYYY") })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="text-center">
          <div
            className="font-heading text-[2rem] font-bold leading-none tracking-tight text-primary sm:text-[3rem]"
            aria-label={`${formatNumber(totals.calories)} ${t("summary.total_calories")}`}
          >
            {formatNumber(totals.calories)}
          </div>
          <div className="mt-2 text-sm font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {t("card.kcal")}
          </div>
          <span className="sr-only">{t("summary.total_calories")}</span>
        </div>

        <div
          className="flex flex-wrap justify-center gap-3"
          aria-label={t("summary.macronutrients")}
        >
          <div className="min-w-[7.5rem] rounded-full border border-teal-500/40 bg-teal-500/15 px-5 py-3 text-center dark:border-teal-400/40 dark:bg-teal-400/15">
            <div className="font-heading text-lg font-bold text-foreground">
              {formatNumber(totals.protein)}g
            </div>
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-teal-600 dark:text-teal-400">
              {t("summary.total_protein")}
            </div>
          </div>
          <div className="min-w-[7.5rem] rounded-full border border-teal-500/40 bg-teal-500/15 px-5 py-3 text-center dark:border-teal-400/40 dark:bg-teal-400/15">
            <div className="font-heading text-lg font-bold text-foreground">
              {formatNumber(totals.carbs)}g
            </div>
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-teal-600 dark:text-teal-400">
              {t("summary.total_carbs")}
            </div>
          </div>
          <div className="min-w-[7.5rem] rounded-full border border-amber-500/40 bg-amber-500/15 px-5 py-3 text-center dark:border-amber-400/40 dark:bg-amber-400/15">
            <div className="font-heading text-lg font-bold text-foreground">
              {formatNumber(totals.fats)}g
            </div>
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-amber-600 dark:text-amber-400">
              {t("summary.total_fats")}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
