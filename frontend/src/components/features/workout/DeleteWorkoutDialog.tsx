"use client";

import * as React from "react";
import { useState } from "react";
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
import { useTranslations } from 'next-intl';

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
  const [isDeleting, setIsDeleting] = useState(false);
  const t = useTranslations('workout.delete_dialog');

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
      setIsDeleting(true);
      deleteWorkout(workout.workoutId);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? t('deleting') : t('confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
