"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { workoutApi } from "@/lib/api"
import { EditWorkoutDialog } from "./EditWorkoutDialog"
import { DeleteWorkoutDialog } from "./DeleteWorkoutDialog"
import { CommentThread } from "@/components/features/comments/CommentThread"
import { Workout, WorkoutExercise, ExerciseSet } from "@/types"
import { useTranslations } from "next-intl"
import { TIME_LIMITS, TARGET_TYPES } from "@/lib/constants"

interface WorkoutListProps {
  workouts?: Workout[]
  readOnly?: boolean
}

export function WorkoutList({
  workouts: propWorkouts,
  readOnly = false
}: WorkoutListProps) {
  const queryClient = useQueryClient()
  const [expandedCommentsId, setExpandedCommentsId] = React.useState<
    string | null
  >(null)
  const [editingWorkout, setEditingWorkout] = React.useState<Workout | null>(
    null
  )
  const [deletingWorkout, setDeletingWorkout] = React.useState<Workout | null>(
    null
  )
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [workoutToDelete, setWorkoutToDelete] = React.useState<Workout | null>(
    null
  )
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const t = useTranslations("workout.list")
  const tCommon = useTranslations("common.actions")

  // Only fetch data if not provided as props
  const { data, isLoading } = useQuery({
    queryKey: ["workouts"],
    queryFn: () => workoutApi.getAll(),
    enabled: !propWorkouts // Don't fetch if workouts are provided as props
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

  if (isLoading && !propWorkouts) {
    return <div>{t("loading")}</div>
  }

  const workouts = propWorkouts || data?.workouts || []

  if (workouts.length === 0) {
    return (
      <div className='text-center p-8 text-muted-foreground'>
        {t("no_workouts")}
      </div>
    )
  }

  return (
    <div className='space-y-4'>
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
                          {ex.sets.length} {t("sets_x")}{" "}
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
