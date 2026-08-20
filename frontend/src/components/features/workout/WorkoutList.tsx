"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "@/lib/i18n/dayjs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { workoutApi } from "@/lib/api";
import { EditWorkoutDialog } from "./EditWorkoutDialog";
import { DeleteWorkoutDialog } from "./DeleteWorkoutDialog";
import { WorkoutFilterBar } from "./WorkoutFilterBar";
import { WorkoutCard } from "./WorkoutCard";
import { Workout } from "@/types";
import { useTranslations } from "next-intl";
import { PAGINATION, TIME_LIMITS } from "@/lib/constants";

export interface WorkoutFilter {
  startDate?: string;
  endDate?: string;
}

interface WorkoutListProps {
  workouts?: Workout[];
  readOnly?: boolean;
  filter?: WorkoutFilter;
  onFilterChange?: (filter: WorkoutFilter) => void;
  page?: number;
  onPageChange?: (page: number) => void;
}

const EMPTY_FILTER: WorkoutFilter = {};

export function WorkoutList({
  workouts: propWorkouts,
  readOnly = false,
  filter: filterProp,
  onFilterChange,
  page: pageProp,
  onPageChange,
}: WorkoutListProps) {
  const t = useTranslations("workout.list");
  const tPagination = useTranslations("workout.pagination");

  const [internalFilter, setInternalFilter] =
    React.useState<WorkoutFilter>(EMPTY_FILTER);
  const [internalPage, setInternalPage] = React.useState(1);

  const filter = filterProp ?? internalFilter;
  const page = pageProp ?? internalPage;

  const handleFilterChange = (next: WorkoutFilter) => {
    if (onFilterChange) {
      onFilterChange(next);
    } else {
      setInternalFilter(next);
      setInternalPage(1);
    }
  };

  const handlePageChange = (next: number) => {
    if (onPageChange) onPageChange(next);
    else setInternalPage(next);
  };

  const [expandedCommentsId, setExpandedCommentsId] = React.useState<
    string | number | null
  >(null);
  const [editingWorkout, setEditingWorkout] = React.useState<Workout | null>(
    null,
  );
  const [workoutToDelete, setWorkoutToDelete] = React.useState<Workout | null>(
    null,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

  const pageSize = PAGINATION.WORKOUT_PAGE_SIZE;
  const isSelfFetching = !propWorkouts;

  // Only fetch data if not provided as props
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

  const handleDeleteClick = (workout: Workout) => {
    setWorkoutToDelete(workout);
    setDeleteDialogOpen(true);
  };

  const canEdit = (workout: Workout) => {
    const createdAt = dayjs(workout.createdAt);
    const now = dayjs();
    return now.diff(createdAt, "hour") < TIME_LIMITS.EDIT_WINDOW_HOURS;
  };

  const handleEditClick = (workout: Workout) => {
    setEditingWorkout(workout);
    setIsEditDialogOpen(true);
  };

  if (isLoading && isSelfFetching) {
    return <div>{t("loading")}</div>;
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
        <div className="text-center p-8 text-muted-foreground">
          {t("no_workouts")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filterBar}

      {isSelfFetching && totalCount > 0 && (
        <div className="text-xs text-muted-foreground">
          {tPagination("count", { count: totalCount })}
        </div>
      )}

      {workouts.map((workout) => (
        <WorkoutCard
          key={workout.workoutId}
          workout={workout}
          readOnly={readOnly}
          canEdit={canEdit}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          expandedCommentsId={expandedCommentsId}
          setExpandedCommentsId={setExpandedCommentsId}
        />
      ))}

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
                className={
                  page >= totalPages ? "pointer-events-none opacity-50" : ""
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
      {!readOnly && (
        <>
          <EditWorkoutDialog
            workout={editingWorkout}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
          />
          <DeleteWorkoutDialog
            workout={workoutToDelete}
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
          />
        </>
      )}
    </div>
  );
}
