"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { workoutApi } from "@/lib/api";
import { Workout } from "@/types";

interface DeleteWorkoutDialogProps {
  workout: Workout | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteWorkoutDialog({
  workout,
  open,
  onOpenChange,
}: DeleteWorkoutDialogProps) {
  const queryClient = useQueryClient();

  const { mutate: deleteWorkout } = useMutation({
    mutationFn: (id: string) => workoutApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workouts"],
        refetchType: "active" // Only refetch active queries
      });
      onOpenChange(false);
    },
    onError: (error) => {
      // TODO: Show toast notification with error message
      console.error("Failed to delete workout:", error);
    },
  });

  const handleDelete = () => {
    if (workout) {
      deleteWorkout(workout.workoutId);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Workout</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this workout? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDelete}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
