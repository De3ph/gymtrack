"use client";

import * as React from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl"

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { mealApi } from "@/lib/api"
import { qk } from "@/lib/query-keys"
import { ApiErrorHandler } from "@/lib/error-handler"
import { DataError } from "@/components/features/DataError"
import { Meal } from "@/types"
import { useMealListStore } from "@/stores/meal-list-store"
import { useCollapseSeed } from "@/hooks/use-collapse-seed"
import { MealCard } from "./MealCard"
import { MealFilterBar } from "./MealFilterBar"
import { PAGINATION } from "@/lib/constants"
import { getPaginationRange } from "@/lib/pagination"
import { staggerContainer } from "@/lib/animations"

export interface MealFilter {
  startDate?: string;
  endDate?: string;
}

interface MealListProps {
  meals?: Meal[]
  filter?: MealFilter
  onFilterChange?: (filter: MealFilter) => void
  page?: number
  onPageChange?: (page: number) => void
  /**
   * Server-side total for the current filter. Pass it when the caller owns
   * the query (trainer client tabs); without it the list only paginates when
   * it fetches by itself.
   */
  totalCount?: number
  /** Start every card except the newest one collapsed (trainer history view). */
  collapseAllExceptFirst?: boolean
}

export function MealList({
  meals: propMeals,
  filter: filterProp,
  onFilterChange,
  page: pageProp,
  onPageChange,
  totalCount: totalCountProp,
  collapseAllExceptFirst = false
}: MealListProps) {
  const t = useTranslations("meal")
  const tPagination = useTranslations("meal.pagination")
  const mealListStore = useMealListStore()

  const filter = filterProp ?? mealListStore.filter;
  const page = pageProp ?? mealListStore.page;

  const handleFilterChange = (next: MealFilter) => {
    if (onFilterChange) {
      onFilterChange(next);
    } else {
      // setFilter resets page to 1 inside the store.
      mealListStore.setFilter(next);
    }
  };

  const handlePageChange = (next: number) => {
    if (onPageChange) onPageChange(next);
    else mealListStore.setPage(next);
  };

  const [expandedCommentsId, setExpandedCommentsId] = React.useState<
    string | number | null
  >(null)

  const pageSize = PAGINATION.MEAL_PAGE_SIZE;
  const isSelfFetching = !propMeals;

  // Only fetch data if not provided as props
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.meals.list({
      page,
      pageSize,
      startDate: filter.startDate,
      endDate: filter.endDate,
    }),
    queryFn: () =>
      mealApi.getAll({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        startDate: filter.startDate,
        endDate: filter.endDate
      }),
    // Keep the previous page visible while the next one loads.
    placeholderData: keepPreviousData,
    enabled: isSelfFetching
  })

  const meals = propMeals || data?.meals || []

  const propTotal = propMeals ? propMeals.length : undefined
  const totalCount = totalCountProp ?? propTotal ?? data?.count ?? 0

  // A caller that supplies its own total owns the paging UI; otherwise only
  // the self-fetching list can paginate.
  const canPaginate = isSelfFetching || totalCountProp !== undefined

  const { collapsedIds, toggleCollapsed } = useCollapseSeed(
    meals.map((m) => m.mealId),
    collapseAllExceptFirst,
  )

  const filterBar = isSelfFetching ? (
    <MealFilterBar
      filter={filter}
      onChange={handleFilterChange}
    />
  ) : null

  if (isLoading && isSelfFetching) {
    return (
      <div className="flex items-center gap-2 border border-border px-6 py-8 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
        <Spinner aria-hidden="true" />
        {t("list.loading")}
      </div>
    )
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
    )
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const showPagination = totalPages > 1 && canPaginate

  if (meals.length === 0) {
    return (
      <div className="space-y-4">
        {filterBar}
        <Empty className="rounded-none border border-border">
          <EmptyHeader>
            <EmptyTitle className="font-mono text-sm uppercase tracking-[0.18em] font-medium text-foreground">
              {t("list.no_meals")}
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {filterBar}

      {canPaginate && totalCount > 0 && (
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {tPagination("count", { count: totalCount })}
        </div>
      )}

      <motion.div
        className="space-y-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence mode="popLayout">
          {meals.map((meal) => (
            <MealCard
              key={meal.mealId}
              meal={meal}
              isCollapsed={Boolean(collapsedIds[String(meal.mealId)])}
              onToggle={() => {
                if (meal.mealId != null) toggleCollapsed(meal.mealId);
              }}
              expandedCommentsId={expandedCommentsId}
              setExpandedCommentsId={setExpandedCommentsId}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      {showPagination && (
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
                className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

    </div>
  )
}
