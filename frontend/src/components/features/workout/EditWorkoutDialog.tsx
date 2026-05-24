"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import dayjs from "dayjs";
import { Loader2, Save } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { workoutApi } from "@/lib/api";
import { ApiErrorHandler } from "@/lib/error-handler";
import { Workout, WorkoutExercise, ExerciseSet } from "@/types";
import {
  workoutWithPerSetSchema,
  WorkoutWithPerSetFormData,
} from "@/lib/validations/workout";
import { DATE_FORMATS } from "@/lib/constants";
import { ExerciseSelector } from "@/components/features/exercise/ExerciseSelector";
import { ExerciseSetInput } from "@/components/features/workout/ExerciseSetInput";
import { useTranslations } from "next-intl";

interface EditWorkoutDialogProps {
  workout: Workout | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditWorkoutDialog({
  workout,
  open,
  onOpenChange,
}: EditWorkoutDialogProps) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<string | null>(null);
  const t = useTranslations("workout.edit_dialog");
  const tCommon = useTranslations("common.actions");

  // Initialize form with workout data when dialog opens
  const form = useForm({
    defaultValues: {
      date: workout ? dayjs(workout.date).toDate() : new Date(),
      workoutTime: workout
        ? dayjs(workout.date).format("HH:mm")
        : dayjs().format("HH:mm"),
      exercises: workout
        ? workout.exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            name: ex.name,
            notes: ex.notes,
            sets: ex.sets.map((set) => ({
              setId: set.setId || "",
              weight: set.weight,
              weightUnit: set.weightUnit,
              reps: set.reps,
              restTime: set.restTime || 60,
              completed: set.completed || false,
            })),
          }))
        : [
            {
              exerciseId: "",
              name: "",
              sets: [
                {
                  weight: 0,
                  weightUnit: "kg" as const,
                  reps: 10,
                  restTime: 60,
                  completed: false,
                } as ExerciseSet,
              ],
            },
          ],
    },
    validators: {
      onSubmit: workoutWithPerSetSchema,
    },
    onSubmit: async ({ value }) => {
      if (!workout) return;
      updateWorkout(value);
    },
  });

  // Reset form and clear error when workout changes
  React.useEffect(() => {
    if (workout && open) {
      setError(null); // Clear any previous errors
      form.reset({
        date: dayjs(workout.date).toDate(),
        workoutTime: dayjs(workout.date).format("HH:mm"),
        exercises: workout.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          name: ex.name,
          notes: ex.notes,
          sets: ex.sets.map((set) => ({
            setId: set.setId || "",
            weight: set.weight,
            weightUnit: set.weightUnit,
            reps: set.reps,
            restTime: set.restTime || 60,
            completed: set.completed || false,
          })),
        })),
      });
    }
  }, [workout, open, form]);

  // Time validation helper
  const validateTimeFormat = (timeStr: string): [number, number] => {
    const timeParts = timeStr.split(":");
    if (timeParts.length !== 2) {
      throw new Error("Invalid time format. Use HH:MM format.");
    }
    const [hours, minutes] = timeParts.map(Number);
    if (
      isNaN(hours) ||
      isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      throw new Error(
        "Invalid time values. Hours must be 0-23, minutes must be 0-59.",
      );
    }
    return [hours, minutes];
  };

  // Mutation for updating workout
  const { mutate: updateWorkout, isPending } = useMutation({
    mutationFn: async (data: WorkoutWithPerSetFormData) => {
      if (!workout) throw new Error("No workout to update");

      // Combine date and time with validation
      const [hours, minutes] = validateTimeFormat(data.workoutTime);
      const combinedDate = dayjs(data.date)
        .hour(hours)
        .minute(minutes)
        .second(0)
        .millisecond(0);

      // Validate exercises before sending to API
      const validExercises = data.exercises.filter(
        (ex) => ex.exerciseId.trim() !== "" && ex.name.trim() !== "",
      );

      if (validExercises.length !== data.exercises.length) {
        throw new Error("All exercises must be selected and have valid names");
      }

      // Convert workout exercises to the format expected by the backend API
      const exercises = validExercises.map((exercise: WorkoutExercise) => {
        return {
          exerciseId: exercise.exerciseId,
          name: exercise.name,
          notes: exercise.notes || "",
          sets: exercise.sets.map((set) => ({
            setId: set.setId || "", // Preserve existing ID or let backend generate
            weight: set.weight,
            weightUnit: set.weightUnit,
            reps: set.reps,
            restTime: set.restTime || 60,
            completed: set.completed || false,
          })),
        };
      });

      return workoutApi.update(workout.workoutId, {
        date: combinedDate.toISOString(),
        exercises: exercises,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workouts"],
        refetchType: "active", // Only refetch active queries
      });
      onOpenChange(false);
    },
    onError: (error) => {
      const errorMessage = ApiErrorHandler.handle(error);
      setError(errorMessage);
      console.error("Failed to update workout:", errorMessage);
      // Auto-clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    form.handleSubmit();
  };

  if (!workout) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-md mx-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col space-y-2">
            <FieldLabel htmlFor="date">{t("date_label")}</FieldLabel>
            <div className="flex flex-wrap gap-4">
              <form.Field name="date">
                {(field) => (
                  <Input
                    value={dayjs(field.state.value).format(
                      DATE_FORMATS.DATE_ONLY,
                    )}
                    onChange={(e) =>
                      field.handleChange(dayjs(e.target.value).toDate())
                    }
                    onBlur={field.handleBlur}
                    type="date"
                    id="date"
                    className="w-full md:w-45"
                  />
                )}
              </form.Field>
              <form.Field name="workoutTime">
                {(field) => (
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    type="time"
                    id="workoutTime"
                    className="w-full md:w-30"
                  />
                )}
              </form.Field>
            </div>
          </div>

          <form.Field name="exercises" mode="array">
            {(field) => (
              <div className="space-y-4">
                {field.state.value.map((exercise, index) => (
                  <Card
                    key={`${exercise.exerciseId || exercise.name}-${index}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold">
                          {field.state.value[index]?.name ||
                            t("fallback_exercise", { number: index + 1 })}
                        </CardTitle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => field.removeValue(index)}
                          disabled={field.state.value.length === 1}
                        >
                          ×
                        </Button>
                      </div>
                      <div className="mt-2">
                        <form.Field name={`exercises[${index}].exerciseId`}>
                          {(subField) => (
                            <ExerciseSelector
                              onSelect={(selectedExercise) => {
                                // Update both exerciseId and name when exercise is selected
                                field.setValue((prev) => {
                                  const newExercises = [...prev];
                                  newExercises[index] = {
                                    ...newExercises[index],
                                    exerciseId: selectedExercise.exerciseId,
                                    name: selectedExercise.name,
                                  };
                                  return newExercises;
                                });
                              }}
                              selectedExerciseId={subField.state.value}
                            />
                          )}
                        </form.Field>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Per-Set Input */}
                      <form.Field name={`exercises[${index}].sets`}>
                        {(subField) => (
                          <ExerciseSetInput
                            value={subField.state.value}
                            onChange={(sets) => {
                              field.setValue((prev) => {
                                const newExercises = [...prev];
                                newExercises[index] = {
                                  ...newExercises[index],
                                  sets: sets,
                                };
                                return newExercises;
                              });
                            }}
                          />
                        )}
                      </form.Field>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </form.Field>

          <div className="flex justify-end space-x-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {t("save_changes")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
