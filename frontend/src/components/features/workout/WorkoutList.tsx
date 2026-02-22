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

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { workoutApi } from "@/lib/api";
import { Workout } from "@/types";
import { EditWorkoutDialog } from "./EditWorkoutDialog";
import { CommentThread } from "@/components/features/comments/CommentThread";

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

  // Only fetch data if not provided as props
  const { data, isLoading } = useQuery({
    queryKey: ["workouts"],
    queryFn: () => workoutApi.getAll(),
    enabled: !propWorkouts, // Don't fetch if workouts are provided as props
  });

  const { mutate: deleteWorkout } = useMutation({
    mutationFn: (id: string) => workoutApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
    },
  });

  // Helper to check 24h window
  const canEdit = (workout: Workout) => {
    const createdAt = dayjs(workout.createdAt);
    const now = dayjs();
    return now.diff(createdAt, "hour") < 24;
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
    <div className="space-y-4">
      {workouts.map((workout) => (
        <Card key={workout.workoutId}>
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Are you sure?"))
                          deleteWorkout(workout.workoutId);
                      }}
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
              {workout.exercises.map((ex, i) => (
                <div key={i} className="flex items-center text-sm">
                  <Dumbbell className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-medium mr-2">{ex.name}:</span>
                  <span className="text-muted-foreground">
                    {ex.sets} x {ex.reps.join(", ")} @ {ex.weight}
                    {ex.weightUnit}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground"
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
              </Button>
              {expandedCommentsId === workout.workoutId && (
                <div className="mt-3">
                  <CommentThread
                    targetType="workout"
                    targetId={workout.workoutId}
                    readOnly={false}
                    enabled={true}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {!readOnly && (
        <EditWorkoutDialog
          workout={editingWorkout}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}
    </div>
  );
}
