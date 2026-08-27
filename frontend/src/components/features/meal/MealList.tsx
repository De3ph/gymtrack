"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { motion, AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl"

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { mealApi } from "@/lib/api"
import { Meal } from "@/types"
import { useMealListStore } from "@/stores/meal-list-store"
import { EditMealDialog } from "./EditMealDialog"
import { MealCard } from "./MealCard"
import { MealFilterBar } from "./MealFilterBar"
import { PAGINATION, TIME_LIMITS } from "@/lib/constants"
import { staggerContainer } from "@/lib/animations"

export interface MealFilter {
  startDate?: string;
  endDate?: string;
}

interface MealListProps {
  meals?: Meal[]
  readOnly?: boolean
  filter?: MealFilter
  onFilterChange?: (filter: MealFilter) => void
  page?: number
  onPageChange?: (page: number) => void
}

export function MealList({
  meals: propMeals,
  readOnly = false,
  filter: filterProp,
  onFilterChange,
  page: pageProp,
  onPageChange
}: MealListProps) {
  const t = useTranslations("meal")
  const tPagination = useTranslations("meal.pagination")
  const queryClient = useQueryClient()
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

  const [editingMeal, setEditingMeal] = React.useState<Meal | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [expandedCommentsId, setExpandedCommentsId] = React.useState<
    string | number | null
  >(null)

  const pageSize = PAGINATION.MEAL_PAGE_SIZE;
  const isSelfFetching = !propMeals;

  // Only fetch data if not provided as props
  const { data, isLoading } = useQuery({
    queryKey: [
      "meals",
      {
        page,
        pageSize,
        startDate: filter.startDate,
        endDate: filter.endDate
      }
    ],
    queryFn: () =>
      mealApi.getAll({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        startDate: filter.startDate,
        endDate: filter.endDate
      }),
    enabled: isSelfFetching
  })

  const { mutate: deleteMeal } = useMutation({
    mutationFn: (id: string | number) => mealApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meals"] })
    }
  })

  const canEdit = (meal: Meal) => {
    const createdAt = dayjs(meal.createdAt)
    const now = dayjs()
    return now.diff(createdAt, "hour") < TIME_LIMITS.EDIT_WINDOW_HOURS
  }

  const handleEditClick = (meal: Meal) => {
    setEditingMeal(meal)
    setIsEditDialogOpen(true)
  }

  if (isLoading && isSelfFetching) {
    return (
      <div className="flex items-center gap-2 border border-border px-6 py-8 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
        <Spinner aria-hidden="true" />
        {t("list.loading")}
      </div>
    )
  }

  const meals = propMeals || data?.meals || []
  const totalCount = propMeals ? propMeals.length : data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const showPagination = isSelfFetching && totalPages > 1

  const filterBar = isSelfFetching ? (
    <MealFilterBar
      filter={filter}
      onChange={handleFilterChange}
    />
  ) : null

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

      {isSelfFetching && totalCount > 0 && (
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
              readOnly={readOnly}
              canEdit={canEdit}
              onEdit={handleEditClick}
              onDelete={deleteMeal}
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
                className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {!readOnly && (
        <EditMealDialog
          meal={editingMeal}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}
    </div>
  )
}
