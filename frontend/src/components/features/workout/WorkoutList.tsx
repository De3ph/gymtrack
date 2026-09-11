"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { workoutApi } from "@/lib/api";
import { useWorkoutListStore } from "@/stores/workout-list-store";
import { WorkoutFilterBar } from "./WorkoutFilterBar";
import { WorkoutCard } from "./WorkoutCard";
import { Workout } from "@/types";
import { useTranslations } from "next-intl";
import { PAGINATION } from "@/lib/constants";

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
}

export function WorkoutList({
  workouts: propWorkouts,
  filter: filterProp,
  onFilterChange,
  page: pageProp,
  onPageChange,
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

  const { data, isLoading } = useQuery({
    queryKey: [
      "workouts",
      {
        page,
        pageSize,
        startDate: filter.startDate,
        endDate: filter.endDate,
      },
    ],
    queryFn: () =>
      workoutApi.getAll({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        startDate: filter.startDate,
        endDate: filter.endDate,
      }),
    enabled: isSelfFetching,
  });

  if (isLoading && isSelfFetching) {
    return (
      <div className="flex items-center gap-2 py-8 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <Spinner className="size-5" />
        <span>{t("loading")}</span>
      </div>
    );
  }

  const workouts = propWorkouts || data?.workouts || [];
  const totalCount = propWorkouts ? propWorkouts.length : (data?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const showPagination = isSelfFetching && totalPages > 1;

  const filterBar = isSelfFetching ? (
    <WorkoutFilterBar filter={filter} onChange={handleFilterChange} />
  ) : null;

  if (workouts.length === 0) {
    return (
      <div className="space-y-4">
        {filterBar}
        <div className="flex items-center justify-center border border-border py-12 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {t("no_workouts")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filterBar}

      {isSelfFetching && totalCount > 0 && (
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {tPagination("count", { count: totalCount })}
        </div>
      )}

      <ul className="space-y-3">
        {workouts.map((workout) => (
          <li key={workout.workoutId}>
            <WorkoutCard
              workout={workout}
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
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
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
              ))}
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
