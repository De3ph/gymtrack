"use client";

import * as React from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { WorkoutList } from "@/components/features/workout/WorkoutList";
import { DataError } from "@/components/features/DataError";
import { Spinner } from "@/components/ui/spinner";
import { trainerClientApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { ApiErrorHandler } from "@/lib/error-handler";
import { PAGINATION } from "@/lib/constants";
import { useTranslations } from "next-intl";
import { toClientDateRange } from "./client-date-range";
import { clientHistoryKey, usePageResetOnChange } from "./client-list-state";

interface WorkoutsTabProps {
  username: string;
  dateRange: { start: string; end: string };
  exerciseType: string;
  /** Distinguishes "nothing logged" from "nothing matches the filters". */
  isFiltered: boolean;
  onCountChange: (count: number | null) => void;
}

export function WorkoutsTab({
  username,
  dateRange,
  exerciseType,
  isFiltered,
  onCountChange,
}: WorkoutsTabProps) {
  const t = useTranslations("trainer.client_detail.tabs");

  const [page, setPage] = usePageResetOnChange(
    clientHistoryKey(username, dateRange, exerciseType),
  );

  const pageSize = PAGINATION.WORKOUT_PAGE_SIZE;
  const range = toClientDateRange(dateRange);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.workouts.clientList(username, {
      page,
      pageSize,
      startDate: range.startDate,
      endDate: range.endDate,
      exerciseType: exerciseType || undefined,
    }),
    queryFn: () =>
      trainerClientApi.getClientWorkouts(username, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        startDate: range.startDate,
        endDate: range.endDate,
        ...(exerciseType && { exerciseType }),
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
  } else if (!data || data.workouts.length === 0) {
    body = (
      <p className="py-8 text-center text-muted-foreground">
        {isFiltered ? t("no_workouts_filtered") : t("no_workouts")}
      </p>
    );
  } else {
    body = (
      <WorkoutList
        workouts={data.workouts}
        totalCount={data.count}
        page={page}
        onPageChange={setPage}
        collapseAllExceptNewest
        showFilterBar={false}
      />
    );
  }

  return (
    <div className="rounded-none border border-border">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("workout_history")}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t("workout_description")}</p>
      </div>
      <div className="p-6">{body}</div>
    </div>
  );
}
