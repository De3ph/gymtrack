"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  Edit2,
  Trash2,
  Dumbbell,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { workoutApi } from "@/lib/api";
import { Workout, WorkoutExercise, ExerciseSet } from "@/types";
import { EditWorkoutDialog } from "./EditWorkoutDialog";
import { CommentThread } from "@/components/features/comments/CommentThread";
import { TIME_LIMITS, TARGET_TYPES } from "@/lib/constants";
import { staggerContainer, staggerItem } from "@/lib/animations";

interface WorkoutListProps {
  workouts?: Workout[];
  readOnly?: boolean;
}

export function WorkoutList({
  workouts: propWorkouts,
  readOnly = false,
}: WorkoutListProps) {
  const queryClient = useQueryClient();
  const [editingWorkout, setEditingWorkout] = React.useState<Workout | null>(
    null,
  );
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [expandedCommentsId, setExpandedCommentsId] = React.useState<
    string | null
  >(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState<Workout | null>(null);

  // Only fetch data if not provided as props
  const { data, isLoading } = useQuery({
    queryKey: ["workouts"],
    queryFn: () => workoutApi.getAll(),
    enabled: !propWorkouts, // Don't fetch if workouts are provided as props
  });

  const { mutate: deleteWorkout } = useMutation({
    mutationFn: (id: string) => workoutApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workouts"],
        refetchType: "active" // Only refetch active queries
      });
    },
    onError: (error) => {
      // TODO: Show toast notification with error message
      console.error("Failed to delete workout:", error);
    },
  });

  const canEdit = (workout: Workout) => {
    const createdAt = dayjs(workout.createdAt);
    const now = dayjs();
    return now.diff(createdAt, "hour") < TIME_LIMITS.EDIT_WINDOW_HOURS;
  };

  const handleEditClick = (workout: Workout) => {
    setEditingWorkout(workout);
    setIsEditDialogOpen(true);
  };

  if (isLoading && !propWorkouts) {
    return <div>Loading workouts...</div>;
  }

  const workouts = propWorkouts || data?.workouts || [];

  if (workouts.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        No workouts logged yet. Start training!
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-4"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence mode="popLayout">
        {workouts.map((workout) => (
          <motion.div
            key={workout.workoutId}
            variants={staggerItem}
            layout
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex flex-col">
                  <CardTitle className="text-base font-semibold">
                    {dayjs(workout.date).format("MMMM D, YYYY")}
                  </CardTitle>
                  <CardDescription>
                    {workout.exercises.length} Exercises
                  </CardDescription>
                </div>
                {!readOnly && (
                  <div className="flex space-x-2">
                    {canEdit(workout) && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(workout)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Workout</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this workout? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                onClick={() => {
                                  if (deleteConfirm) {
                                    deleteWorkout(deleteConfirm.workoutId);
                                    setDeleteConfirm(null);
                                  }
                                }}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirm(workout)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {workout.exercises.map((ex: WorkoutExercise, i: number) => (
                    <div key={i} className="flex items-center text-sm">
                      <Dumbbell className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="font-medium mr-2">{ex.name}:</span>
                      <span className="text-muted-foreground">
                        {ex.sets && ex.sets.length > 0 ? (
                          <>
                            {ex.sets.length} sets x {ex.sets.map((set: ExerciseSet) => `${set.reps} reps @ ${set.weight}${set.weightUnit || 'kg'}`).join(', ')}
                          </>
                        ) : (
                          'No sets defined'
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-3">
                  <button
                    type="button"
                    className="w-full justify-start text-muted-foreground flex items-center hover:bg-accent/50 rounded-md px-2 py-2 transition-colors"
                    onClick={() =>
                      setExpandedCommentsId((id) =>
                        id === workout.workoutId ? null : workout.workoutId,
                      )
                    }
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Comments
                    {expandedCommentsId === workout.workoutId ? (
                      <ChevronUp className="ml-auto h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-auto h-4 w-4" />
                    )}
                  </button>
                  <AnimatePresence>
                    {expandedCommentsId === workout.workoutId && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-3 overflow-hidden"
                      >
                        <CommentThread
                          targetType={TARGET_TYPES.WORKOUT}
                          targetId={workout.workoutId}
                          readOnly={false}
                          enabled={true}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {!readOnly && (
        <EditWorkoutDialog
          workout={editingWorkout}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}
    </motion.div>
  );
}
