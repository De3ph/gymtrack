"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Dumbbell
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination"
import { workoutApi } from "@/lib/api"
import { EditWorkoutDialog } from "./EditWorkoutDialog"
import { DeleteWorkoutDialog } from "./DeleteWorkoutDialog"
import { WorkoutFilterBar } from "./WorkoutFilterBar"
import { CommentThread } from "@/components/features/comments/CommentThread"
import { Workout, WorkoutExercise, ExerciseSet } from "@/types"
import { useTranslations } from "next-intl"
import { PAGINATION, TIME_LIMITS, TARGET_TYPES } from "@/lib/constants"

export interface WorkoutFilter {
  startDate?: string;
  endDate?: string;
}

interface WorkoutListProps {
  workouts?: Workout[]
  readOnly?: boolean
  filter?: WorkoutFilter
  onFilterChange?: (filter: WorkoutFilter) => void
  page?: number
  onPageChange?: (page: number) => void
}

const EMPTY_FILTER: WorkoutFilter = {};

export function WorkoutList({
  workouts: propWorkouts,
  readOnly = false,
  filter: filterProp,
  onFilterChange,
  page: pageProp,
  onPageChange
}: WorkoutListProps) {
  const t = useTranslations("workout.list")
  const tPagination = useTranslations("workout.pagination")

  const [internalFilter, setInternalFilter] = React.useState<WorkoutFilter>(EMPTY_FILTER);
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
  >(null)
  const [editingWorkout, setEditingWorkout] = React.useState<Workout | null>(
    null
  )
  const [workoutToDelete, setWorkoutToDelete] = React.useState<Workout | null>(
    null
  )
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)

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
        endDate: filter.endDate
      }
    ],
    queryFn: () =>
      workoutApi.getAll({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        startDate: filter.startDate,
        endDate: filter.endDate
      }),
    enabled: isSelfFetching
  })

  const handleDeleteClick = (workout: Workout) => {
    setWorkoutToDelete(workout)
    setDeleteDialogOpen(true)
  }

  const canEdit = (workout: Workout) => {
    const createdAt = dayjs(workout.createdAt)
    const now = dayjs()
    return now.diff(createdAt, "hour") < TIME_LIMITS.EDIT_WINDOW_HOURS
  }

  const handleEditClick = (workout: Workout) => {
    setEditingWorkout(workout)
    setIsEditDialogOpen(true)
  }

  if (isLoading && isSelfFetching) {
    return <div>{t("loading")}</div>
  }

  const workouts = propWorkouts || data?.workouts || []
  const totalCount = propWorkouts ? propWorkouts.length : data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const showPagination = isSelfFetching && totalPages > 1

  const filterBar = isSelfFetching ? (
    <WorkoutFilterBar
      filter={filter}
      onChange={handleFilterChange}
    />
  ) : null

  if (workouts.length === 0) {
    return (
      <div className='space-y-4'>
        {filterBar}
        <div className='text-center p-8 text-muted-foreground'>
          {t("no_workouts")}
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      {filterBar}

      {isSelfFetching && totalCount > 0 && (
        <div className='text-xs text-muted-foreground'>
          {tPagination("count", { count: totalCount })}
        </div>
      )}

      {workouts.map((workout) => (
        <div key={workout.workoutId}>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <div className='flex flex-col'>
                <CardTitle className='text-base font-semibold'>
                  {dayjs(workout.date).format("MMMM D, YYYY")}
                </CardTitle>
                <CardDescription>
                  {workout.exercises.length} {t("exercises")}
                </CardDescription>
              </div>
              {!readOnly && (
                <div className='flex space-x-2'>
                  {canEdit(workout) && (
                    <>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => handleEditClick(workout)}
                      >
                        <Edit2 className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => handleDeleteClick(workout)}
                      >
                        <Trash2 className='h-4 w-4 text-destructive' />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                {workout.exercises.map((ex: WorkoutExercise, i: number) => (
                  <div key={i} className='flex items-center text-sm'>
                    <Dumbbell className='mr-2 h-4 w-4 text-muted-foreground' />
                    <span className='font-medium mr-2'>{ex.name}:</span>
                    <span className='text-muted-foreground'>
                      {ex.sets && ex.sets.length > 0 ? (
                        <>
                          {t("sets_x", { sets: ex.sets.length })}{" "}
                          {ex.sets
                            .map(
                              (set: ExerciseSet) =>
                                t("set_detail", { reps: set.reps, weight: set.weight, unit: set.weightUnit || "kg" })
                            )
                            .join(", ")}
                        </>
                      ) : (
                        t("no_sets")
                      )}
                    </span>
                  </div>
                ))}
              </div>
              <div className='border-t pt-3'>
                <button
                  type='button'
                  className='w-full justify-start text-muted-foreground flex items-center hover:bg-accent/50 rounded-md px-2 py-2 transition-colors'
                  onClick={() =>
                    setExpandedCommentsId((id) =>
                      id === workout.workoutId ? null : workout.workoutId
                    )
                  }
                >
                  <MessageSquare className='mr-2 h-4 w-4' />
                  {t("comments")}
                  {expandedCommentsId === workout.workoutId ? (
                    <ChevronUp className='ml-auto h-4 w-4' />
                  ) : (
                    <ChevronDown className='ml-auto h-4 w-4' />
                  )}
                </button>
                {expandedCommentsId === workout.workoutId && (
                  <div className='mt-3 overflow-hidden'>
                    <CommentThread
                      targetType={TARGET_TYPES.WORKOUT}
                      targetId={workout.workoutId}
                      readOnly={false}
                      enabled={true}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ))}

      {showPagination && (
        <Pagination className='mt-6'>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={(e) => {
                  e.preventDefault()
                  if (page > 1) handlePageChange(page - 1)
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
                    e.preventDefault()
                    handlePageChange(p)
                  }}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={(e) => {
                  e.preventDefault()
                  if (page < totalPages) handlePageChange(page + 1)
                }}
                aria-disabled={page >= totalPages}
                className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
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
  )
}
