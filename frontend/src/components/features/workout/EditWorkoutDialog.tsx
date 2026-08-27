"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import dayjs from "dayjs";
import { formatDate } from "@/lib/i18n/dayjs";
import { Save } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { workoutApi } from "@/lib/api";
import { ApiErrorHandler } from "@/lib/error-handler";
import { Workout, ExerciseSet } from "@/types";
import {
  createWorkoutWithPerSetSchema,
  WorkoutWithPerSetFormData,
} from "@/lib/validations/workout";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldError } from "@/components/ui/field";

const ExerciseSelector = dynamic(
  () =>
    import("@/components/features/exercise/ExerciseSelector").then(
      (m) => m.ExerciseSelector,
    ),
  { ssr: false, loading: () => <Skeleton className="h-9 w-28" /> },
);
import { ExerciseSetInput } from "@/components/features/workout/ExerciseSetInput";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

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
  const tValidation = useTranslations("workout.form.validation");
  const tCommon = useTranslations("common.actions");

  const workoutWithPerSetSchema = React.useMemo(
    () => createWorkoutWithPerSetSchema((key) => tValidation(key)),
    [tValidation],
  );

  const defaultValues = React.useMemo(
    () => ({
      date: workout ? dayjs(workout.date).toDate() : new Date(),
      workoutTime: workout
        ? formatDate(new Date(workout.date), "HH:mm")
        : formatDate(new Date(), "HH:mm"),
      exercises: workout
        ? workout.exercises.map((ex) => ({
            exerciseId: String(ex.exerciseId),
            name: ex.name,
            notes: ex.notes,
            sets: ex.sets.map((set) => ({
              setId: set.setId ?? undefined,
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
    }),
    [workout],
  );

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: workoutWithPerSetSchema,
    },
    onSubmit: async ({ value }) => {
      if (!workout) return;
      updateWorkout(value);
    },
  });

  React.useEffect(() => {
    if (workout && open) {
      form.reset({
        date: dayjs(workout.date).toDate(),
        workoutTime: formatDate(workout.date, "HH:mm"),
        exercises: workout.exercises.map((ex) => ({
          exerciseId: String(ex.exerciseId),
          name: ex.name,
          notes: ex.notes,
          sets: ex.sets.map((set) => ({
            setId: set.setId ?? undefined,
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

  const validateTimeFormat = (timeStr: string): [number, number] => {
    const timeParts = timeStr.split(":");
    if (timeParts.length !== 2) {
      throw new Error(t("invalid_time_format"));
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
      throw new Error(t("invalid_time_values"));
    }
    return [hours, minutes];
  };

  const { mutate: updateWorkout, isPending } = useMutation({
    mutationFn: async (data: WorkoutWithPerSetFormData) => {
      if (!workout) throw new Error(t("no_workout_to_update"));

      const [hours, minutes] = validateTimeFormat(data.workoutTime);
      const combinedDate = dayjs(data.date)
        .hour(hours)
        .minute(minutes)
        .second(0)
        .millisecond(0);

      const validExercises = data.exercises.filter(
        (ex) => ex.exerciseId.trim() !== "" && ex.name.trim() !== "",
      );

      if (validExercises.length !== data.exercises.length) {
        throw new Error(t("exercises_must_be_valid"));
      }

      const exercises = validExercises.map((exercise) => {
        return {
          exerciseId: Number(exercise.exerciseId),
          name: exercise.name,
          notes: exercise.notes || "",
          sets: exercise.sets.map((set) => ({
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
        refetchType: "active",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      const errorMessage = ApiErrorHandler.handle(error);
      setError(errorMessage);
      console.error("Failed to update workout:", errorMessage);
      setTimeout(() => setError(null), 5000);
    },
  });

  const handleSubmit = React.useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      form.handleSubmit();
    },
    [form],
  );

  if (!workout) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto rounded-none border border-border p-0 text-foreground shadow-none ring-0">
        <DialogHeader className="border-b border-border px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-6">
          <DialogTitle className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div
            role="alert"
            className="border-b border-destructive px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-destructive sm:px-6"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 px-4 py-4 sm:px-6 sm:py-6">
          <Field>
            <FieldLabel
              htmlFor="date"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
            >
              {t("date_label")}
            </FieldLabel>
            <div className="flex flex-wrap gap-3">
              <form.Field name="date">
                {(field) => (
                  <DatePicker
                    value={field.state.value}
                    onChange={(d) => {
                      if (d) field.handleChange(d);
                    }}
                    onBlur={field.handleBlur}
                    id="date"
                    className="w-full md:w-45"
                    required
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
            <FieldError
              errors={
                form.state.fieldMeta.date?.errors?.map((e) => ({
                  message: typeof e === "string" ? e : e.message,
                })) as Array<{ message?: string } | undefined> | undefined
              }
            />
          </Field>

          <Separator />

          <form.Field name="exercises" mode="array">
            {(field) => (
              <div className="space-y-4">
                {field.state.value.map((exercise, index) => (
                  <article
                    key={`${exercise.exerciseId || exercise.name}-${index}`}
                    className="border border-border"
                  >
                    <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
                      <h3 className="text-base font-semibold text-foreground">
                        {field.state.value[index]?.name ||
                          t("fallback_exercise", { number: index + 1 })}
                      </h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => field.removeValue(index)}
                        disabled={field.state.value.length === 1}
                        aria-label={t("remove_exercise")}
                        className="h-8 w-8 rounded-none text-muted-foreground hover:text-destructive"
                      >
                        ×
                      </Button>
                    </header>

                    <div className="space-y-4 px-4 py-3 sm:px-6 sm:py-4">
                      <form.Field name={`exercises[${index}].exerciseId`}>
                        {(subField) => (
                          <ExerciseSelector
                            onSelect={(selectedExercise) => {
                              field.setValue((prev) => {
                                const newExercises = [...prev];
                                newExercises[index] = {
                                  ...newExercises[index],
                                  exerciseId: String(
                                    selectedExercise.exerciseId,
                                  ),
                                  name: selectedExercise.name,
                                };
                                return newExercises;
                              });
                            }}
                            selectedExerciseId={subField.state.value}
                          />
                        )}
                      </form.Field>

                      <Separator />

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
                    </div>
                  </article>
                ))}
              </div>
            )}
          </form.Field>

          <Separator />

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className={cn(
                "rounded-none font-mono text-[10px] uppercase tracking-[0.18em]",
              )}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="rounded-none font-mono text-[10px] uppercase tracking-[0.18em]"
            >
              {isPending && <Spinner className="size-5" />}
              <Save className="size-5" aria-hidden="true" />
              {t("save_changes")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
