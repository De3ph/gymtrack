"use client";

import * as React from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { workoutSchema, type WorkoutFormData } from "@/lib/validations/workout";
import { workoutApi } from "@/lib/api"
import { ApiErrorHandler } from "@/lib/error-handler";
import { Workout } from "@/types";
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

  const form = useForm<WorkoutFormData>({
    resolver: zodResolver(workoutSchema),
    defaultValues: {
      date: new Date(),
      workoutTime: format(new Date(), "HH:mm"),
      exercises: [
        {
          name: "",
          weight: 0,
          weightUnit: "kg",
          sets: 3,
          reps: [10],
          restTime: 60,
        },
      ],
    },
  });

  // Reset form when workout changes
  React.useEffect(() => {
    if (workout) {
      const workoutDate = parseISO(workout.date);
      form.reset({
        date: workoutDate,
        workoutTime: format(workoutDate, "HH:mm"),
        exercises: workout.exercises.map((ex) => ({
          name: ex.name,
          weight: ex.weight,
          weightUnit: ex.weightUnit,
          sets: ex.sets,
          reps: ex.reps,
          restTime: ex.restTime,
        })),
      });
    }
  }, [workout, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "exercises",
  });

  // Mutation for updating workout
  const { mutate: updateWorkout, isPending } = useMutation({
    mutationFn: async (data: WorkoutFormData) => {
      if (!workout) return;
      // Combine date and time
      const [hours, minutes] = data.workoutTime.split(':').map(Number);
      const combinedDate = new Date(data.date);
      combinedDate.setHours(hours, minutes, 0, 0);

      return workoutApi.update(workout.workoutId, {
        date: combinedDate.toISOString(),
        exercises: data.exercises,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      onOpenChange(false);
    },
    onError: (error) => {
      const errorMessage = ApiErrorHandler.handle(error);
      // TODO: Show toast notification with errorMessage
      console.error("Failed to update workout:", errorMessage);
    },
  });

  const onSubmit = (data: WorkoutFormData) => {
    updateWorkout(data);
  };

  if (!workout) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Workout</DialogTitle>
          <DialogDescription>
            Update your workout details. Changes can only be made within 24 hours of
            logging.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="date">Workout Date & Time</Label>
            <div className="flex flex-wrap gap-4">
              <Input
                type="date"
                id="date"
                {...form.register("date", { valueAsDate: true })}
                className="w-full md:w-[180px]"
              />
              <Input
                type="time"
                id="workoutTime"
                {...form.register("workoutTime")}
                className="w-full md:w-[120px]"
              />
            </div>
            {(form.formState.errors.date || form.formState.errors.workoutTime) && (
              <p className="text-sm text-destructive">
                {form.formState.errors.date?.message || form.formState.errors.workoutTime?.message}
              </p>
            )}
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <Card key={field.id} className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">
                    Exercise {index + 1}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Exercise Name</Label>
                    <Input
                      placeholder="e.g. Bench Press"
                      {...form.register(`exercises.${index}.name`)}
                      className={cn(
                        form.formState.errors.exercises?.[index]?.name &&
                        "border-destructive"
                      )}
                    />
                    {form.formState.errors.exercises?.[index]?.name && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.exercises[index]?.name?.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Weight & Unit</Label>
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        step="0.5"
                        className="flex-1"
                        placeholder="Weight"
                        {...form.register(`exercises.${index}.weight`, {
                          valueAsNumber: true,
                        })}
                      />
                      <select
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                        {...form.register(`exercises.${index}.weightUnit`)}
                      >
                        <option value="kg">kg</option>
                        <option value="lbs">lbs</option>
                      </select>
                    </div>
                    {form.formState.errors.exercises?.[index]?.weight && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.exercises[index]?.weight?.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Sets & Rest</Label>
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        placeholder="Sets"
                        {...form.register(`exercises.${index}.sets`, {
                          valueAsNumber: true,
                        })}
                      />
                      <Input
                        type="number"
                        placeholder="Rest(s)"
                        {...form.register(`exercises.${index}.restTime`, {
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 col-span-full">
                    <Label>Reps (comma separated for multiple sets)</Label>
                    <Input
                      placeholder="e.g. 10, 10, 8"
                      {...form.register(`exercises.${index}.reps`, {
                        setValueAs: (v) => {
                          if (Array.isArray(v)) return v;
                          if (typeof v === "string")
                            return v
                              .split(",")
                              .map((n) => parseInt(n.trim()))
                              .filter((n) => !isNaN(n));
                          return [];
                        },
                      })}
                    />
                    {form.formState.errors.exercises?.[index]?.reps && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.exercises[index]?.reps?.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Enter reps for each set, separated by commas
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                append({
                  name: "",
                  weight: 0,
                  weightUnit: "kg",
                  sets: 3,
                  reps: [10],
                  restTime: 60,
                })
              }
              className="w-full md:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Exercise
            </Button>
            <div className="flex space-x-2 md:ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
