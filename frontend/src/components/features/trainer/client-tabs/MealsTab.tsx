"use client";

import * as React from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { MealList } from "@/components/features/meal/MealList";
import { DataError } from "@/components/features/DataError";
import { Spinner } from "@/components/ui/spinner";
import { trainerClientApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { ApiErrorHandler } from "@/lib/error-handler";
import { PAGINATION } from "@/lib/constants";
import { useTranslations } from "next-intl";
import { toClientDateRange } from "./client-date-range";
import { clientHistoryKey, usePageResetOnChange } from "./client-list-state";

interface MealsTabProps {
  username: string;
  dateRange: { start: string; end: string };
  mealType: string;
  /** Distinguishes "nothing logged" from "nothing matches the filters". */
  isFiltered: boolean;
  onCountChange: (count: number | null) => void;
}

export function MealsTab({
  username,
  dateRange,
  mealType,
  isFiltered,
  onCountChange,
}: MealsTabProps) {
  const t = useTranslations("trainer.client_detail.tabs");

  const [page, setPage] = usePageResetOnChange(
    clientHistoryKey(username, dateRange, mealType),
  );

  const pageSize = PAGINATION.MEAL_PAGE_SIZE;
  const range = toClientDateRange(dateRange);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.meals.clientList(username, {
      page,
      pageSize,
      startDate: range.startDate,
      endDate: range.endDate,
      mealType: mealType || undefined,
    }),
    queryFn: () =>
      trainerClientApi.getClientMeals(username, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        startDate: range.startDate,
        endDate: range.endDate,
        ...(mealType && { mealType }),
      }),
    // Keep the current page on screen while the next one loads.
    placeholderData: keepPreviousData,
  });

  const total = data?.count ?? null;

  React.useEffect(() => {
    onCountChange(total);
  }, [total, onCountChange]);

  let body: React.ReactNode;

  if (isLoading) {
    body = (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Spinner aria-hidden="true" />
        {t("loading")}
      </div>
    );
  } else if (error) {
    body = (
      <DataError
        message={ApiErrorHandler.handle(error)}
        onRetry={() => refetch()}
      />
    );
  } else if (!data || data.meals.length === 0) {
    body = (
      <p className="py-8 text-center text-muted-foreground">
        {isFiltered ? t("no_meals_filtered") : t("no_meals")}
      </p>
    );
  } else {
    body = (
      <MealList
        meals={data.meals}
        totalCount={data.count}
        page={page}
        onPageChange={setPage}
        collapseAllExceptNewest
      />
    );
  }

  return (
    <div className="rounded-none border border-border">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("meal_history")}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t("meal_description")}</p>
      </div>
      <div className="p-6">{body}</div>
    </div>
  );
}
