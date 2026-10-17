"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { mealApi } from "@/lib/api";
import { withTiming } from "@/lib/performance";
import { qk } from "@/lib/query-keys";
import { ApiErrorHandler } from "@/lib/error-handler";
import { DataError } from "@/components/features/DataError";
import { API, DATE_FORMATS } from "@/lib/constants";
import dayjs from "dayjs";

interface DailyNutritionSummaryProps {
  date: dayjs.Dayjs
}

export function DailyNutritionSummary({ date }: DailyNutritionSummaryProps) {
  const t = useTranslations("meal");
  const dateStr = date.format(DATE_FORMATS.DATE_ONLY);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.meals.byDate(dateStr),
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
      <div className="border border-border">
        <header className="border-b border-border px-6 py-4 sm:px-8">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {t("summary.loading_title")}
          </h3>
        </header>
        <div className="space-y-4 p-6 sm:p-8">
          {[...Array(4)].map((_, index) => (
            <Skeleton
              key={index}
              className="h-10 w-full rounded-none"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="border border-border">
      <header className="border-b border-border px-6 py-4 sm:px-8">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {t("summary.title_with_date", { date: date.format("MMMM D, YYYY") })}
        </h3>
      </header>
      <div className="space-y-8 px-6 py-6 sm:px-8 sm:py-8">
        <div className="text-center">
          <div
            className="font-mono text-4xl leading-none tracking-tight text-foreground sm:text-5xl"
            aria-label={`${formatNumber(totals.calories)} ${t("summary.total_calories")}`}
          >
            {formatNumber(totals.calories)}
          </div>
          <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {t("card.kcal")}
          </div>
          <span className="sr-only">{t("summary.total_calories")}</span>
        </div>

        <Separator />

        <div
          className="grid grid-cols-3 divide-x divide-border border border-border"
          aria-label={t("summary.macronutrients")}
        >
          <div className="px-4 py-4 text-center sm:px-5 sm:py-5">
            <div className="font-mono text-lg leading-none tracking-tight text-foreground sm:text-xl">
              {formatNumber(totals.protein)}g
            </div>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {t("summary.total_protein")}
            </div>
          </div>
          <div className="px-4 py-4 text-center sm:px-5 sm:py-5">
            <div className="font-mono text-lg leading-none tracking-tight text-foreground sm:text-xl">
              {formatNumber(totals.carbs)}g
            </div>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {t("summary.total_carbs")}
            </div>
          </div>
          <div className="px-4 py-4 text-center sm:px-5 sm:py-5">
            <div className="font-mono text-lg leading-none tracking-tight text-foreground sm:text-xl">
              {formatNumber(totals.fats)}g
            </div>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {t("summary.total_fats")}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
