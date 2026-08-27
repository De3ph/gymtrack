"use client";

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
import { Spinner } from "@/components/ui/spinner";
import { workoutApi } from "@/lib/api";
import { Workout } from "@/types";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

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
  const t = useTranslations("workout.delete_dialog");

  const { mutate: deleteWorkout } = useMutation({
    mutationFn: (id: string | number) => workoutApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workouts"],
        refetchType: "active",
      });
      onOpenChange(false);
    },
    onError: (error) => {
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
      <AlertDialogContent className="rounded-none border border-border bg-popover text-popover-foreground shadow-none ring-0">
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {t("title")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            {t("description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel
            variant="outline"
            className={cn(
              "rounded-none font-mono text-[10px] uppercase tracking-[0.18em]",
            )}
          >
            {t("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-none font-mono text-[10px] uppercase tracking-[0.18em]"
          >
            {isDeleting && <Spinner className="size-5" />}
            {isDeleting ? t("deleting") : t("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
