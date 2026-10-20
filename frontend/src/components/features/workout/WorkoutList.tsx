"use client";

import * as React from "react";
import { Dumbbell } from "lucide-react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { DataError } from "@/components/features/DataError";
import { workoutApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { ApiErrorHandler } from "@/lib/error-handler";
import { useWorkoutListStore } from "@/stores/workout-list-store";
import { useCollapseSeed } from "@/hooks/use-collapse-seed";
import { WorkoutFilterBar } from "./WorkoutFilterBar";
import { WorkoutCard } from "./WorkoutCard";
import { Workout } from "@/types";
import { useTranslations } from "next-intl";
import { PAGINATION } from "@/lib/constants";
import { getPaginationRange } from "@/lib/pagination";

export interface WorkoutFilter {
  startDate?: string;
  endDate?: string;
}

interface WorkoutListProps {
  workouts?: Workout[];
  filter?: WorkoutFilter;
  onFilterChange?: (filter: WorkoutFilter) => void;
  page?: number;
  onPageChange?: (page: number) => void;
  /**
   * Server-side total for the current filter. Pass it when the caller owns
   * the query (trainer client tabs); without it the list only paginates when
   * it fetches by itself.
   */
  totalCount?: number;
  /**
   * Start every card collapsed except the most recent one. On by default —
   * pass `false` to show every card expanded.
   */
  collapseAllExceptNewest?: boolean;
  /** Hide the built-in filter bar when the parent owns the filters. */
  showFilterBar?: boolean;
}

export function WorkoutList({
  workouts: propWorkouts,
  filter: filterProp,
  onFilterChange,
  page: pageProp,
  onPageChange,
  totalCount: totalCountProp,
  collapseAllExceptNewest = true,
  showFilterBar = true,
}: WorkoutListProps) {
  const t = useTranslations("workout.list");
  const tPagination = useTranslations("workout.pagination");
  const workoutListStore = useWorkoutListStore();

  const filter = filterProp ?? workoutListStore.filter;
  const page = pageProp ?? workoutListStore.page;

  const handleFilterChange = (next: WorkoutFilter) => {
    if (onFilterChange) {
      onFilterChange(next);
    } else {
      workoutListStore.setFilter(next);
    }
  };

  const handlePageChange = (next: number) => {
    if (onPageChange) onPageChange(next);
    else workoutListStore.setPage(next);
  };

  const [expandedCommentsId, setExpandedCommentsId] = React.useState<
    string | number | null
  >(null);

  const pageSize = PAGINATION.WORKOUT_PAGE_SIZE;
  const isSelfFetching = !propWorkouts;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.workouts.list({
      page,
      pageSize,
      startDate: filter.startDate,
      endDate: filter.endDate,
    }),
    queryFn: () =>
      workoutApi.getAll({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        startDate: filter.startDate,
        endDate: filter.endDate,
      }),
    // Keep the previous page on screen while the next one loads instead of
    // flashing a skeleton on every page turn.
    placeholderData: keepPreviousData,
    enabled: isSelfFetching,
  });

  const workouts = propWorkouts || data?.workouts || [];

  const propTotal = propWorkouts ? propWorkouts.length : undefined;
  const totalCount = totalCountProp ?? propTotal ?? data?.count ?? 0;

  // A caller that supplies its own total owns the paging UI; otherwise only
  // the self-fetching list can paginate.
  const canPaginate = isSelfFetching || totalCountProp !== undefined;

  const { collapsedIds, toggleCollapsed } = useCollapseSeed(
    workouts.map((w) => ({ id: w.workoutId, date: w.date })),
    collapseAllExceptNewest,
  );

  const filterBar = isSelfFetching && showFilterBar ? (
    <WorkoutFilterBar filter={filter} onChange={handleFilterChange} />
  ) : null;

  if (isLoading && isSelfFetching) {
    return (
      <div className="space-y-4">
        {filterBar}
        <WorkoutCardSkeleton />
        <WorkoutCardSkeleton />
        <WorkoutCardSkeleton />
      </div>
    );
  }

  if (isSelfFetching && error) {
    return (
      <div className="space-y-4">
        {filterBar}
        <DataError
          message={ApiErrorHandler.handle(error)}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const showPagination = totalPages > 1 && canPaginate;

  if (workouts.length === 0) {
    return (
      <div className="space-y-4">
        {filterBar}
        <div className="enter-rise flex flex-col items-center justify-center gap-3 border border-border px-4 py-16 text-center">
          <Dumbbell className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="max-w-sm text-sm text-muted-foreground">
            {t("no_workouts")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filterBar}

      {canPaginate && totalCount > 0 && (
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {tPagination("count", { count: totalCount })}
        </div>
      )}

      <ul className="space-y-3">
        {workouts.map((workout) => (
          <li key={workout.workoutId}>
            <WorkoutCard
              workout={workout}
              isCollapsed={Boolean(collapsedIds[String(workout.workoutId)])}
              onToggle={() => toggleCollapsed(workout.workoutId)}
              expandedCommentsId={expandedCommentsId}
              setExpandedCommentsId={setExpandedCommentsId}
            />
          </li>
        ))}
      </ul>

      {showPagination && (
        <>
          <Separator />
          <Pagination className="mt-6">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={(e) => {
                    e.preventDefault();
                    if (page > 1) handlePageChange(page - 1);
                  }}
                  aria-disabled={page <= 1}
                  className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {getPaginationRange(page, totalPages).map((p, index) =>
                p === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={p}>
                    <PaginationLink
                      isActive={p === page}
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(p);
                      }}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}
              <PaginationItem>
                <PaginationNext
                  onClick={(e) => {
                    e.preventDefault();
                    if (page < totalPages) handlePageChange(page + 1);
                  }}
                  aria-disabled={page >= totalPages}
                  className={
                    page >= totalPages ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </>
      )}
    </div>
  );
}

function WorkoutCardSkeleton() {
  return (
    <div className="border border-border">
      <div className="border-b border-border px-4 py-3 sm:px-6 sm:py-4">
        <Skeleton className="h-4 w-40 rounded-none" />
        <Skeleton className="mt-2 h-2.5 w-24 rounded-none" />
      </div>
      <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-44 rounded-none" />
          <Skeleton className="h-3 w-72 rounded-none" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-36 rounded-none" />
          <Skeleton className="h-3 w-60 rounded-none" />
        </div>
      </div>
    </div>
  );
}
