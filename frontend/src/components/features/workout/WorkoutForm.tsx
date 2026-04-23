"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import dayjs from "dayjs";
import { motion, AnimatePresence } from "motion/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { FieldInfo } from "@/components/ui/form-field";
import { workoutApi } from "@/lib/api";
import { ApiErrorHandler } from "@/lib/error-handler";
import { cn } from "@/lib/utils";
import { workoutSchema, type WorkoutFormData } from "@/lib/validations/workout";
import { TIME_LIMITS } from "@/lib/constants";
import { formField } from "@/lib/animations";

interface WorkoutFormProps {
  onSuccess?: () => void;
}

export function WorkoutForm({ onSuccess }: WorkoutFormProps) {
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      date: dayjs().format("YYYY-MM-DD"),
      workoutTime: dayjs().format("HH:mm"),
      exercises: [
        {
          name: "",
          weight: 0,
          weightUnit: "kg" as "kg" | "lbs",
          sets: 3,
          reps: [TIME_LIMITS.DEFAULT_REPS] as number[],
          restTime: TIME_LIMITS.DEFAULT_REST_SECONDS as number,
        },
      ],
    },
    onSubmit: async ({ value }) => {
      createWorkout(value);
    },
  });

  // Mutation for creating workout
  const { mutate: createWorkout, isPending } = useMutation({
    mutationFn: async (data: any) => {
      // Combine date and time
      const [hours, minutes] = data.workoutTime.split(":").map(Number);
      const combinedDate = dayjs(data.date)
        .hour(hours)
        .minute(minutes)
        .second(0)
        .millisecond(0);

      return workoutApi.create({
        date: combinedDate.toISOString(),
        exercises: data.exercises,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      form.reset();
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      const errorMessage = ApiErrorHandler.handle(error);
      // TODO: Show toast notification with errorMessage
      console.error("Failed to log workout:", errorMessage);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="space-y-6"
    >
      <div className="flex flex-col space-y-2">
        <FieldLabel htmlFor="date">Workout Date & Time</FieldLabel>
        <div className="flex flex-wrap gap-4">
          <form.Field name="date">
            {(field) => (
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type="date"
                id="date"
                className="w-full md:w-[180px]"
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
                className="w-full md:w-[120px]"
              />
            )}
          </form.Field>
        </div>
      </div>

      <form.Field name="exercises" mode="array">
        {(field) => (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {field.state.value.map((_, index) => (
                <motion.div
                  key={index}
                  variants={formField}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                >
                  <Card className="relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => field.removeValue(index)}
                      disabled={field.state.value.length === 1}
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
                        <FieldLabel>Exercise Name</FieldLabel>
                        <form.Field name={`exercises[${index}].name`}>
                          {(subField) => (
                            <Field>
                              <Input
                                value={subField.state.value}
                                onChange={(e) => subField.handleChange(e.target.value)}
                                onBlur={subField.handleBlur}
                                placeholder="e.g. Bench Press"
                              />
                              <FieldInfo field={subField} />
                            </Field>
                          )}
                        </form.Field>
                      </div>

                      <div className="space-y-2">
                        <FieldLabel>Weight & Unit</FieldLabel>
                        <div className="flex space-x-2">
                          <form.Field name={`exercises[${index}].weight`}>
                            {(subField) => (
                              <Input
                                value={subField.state.value}
                                onChange={(e) => subField.handleChange(Number(e.target.value))}
                                onBlur={subField.handleBlur}
                                type="number"
                                step="0.5"
                                className="flex-1"
                                placeholder="Weight"
                              />
                            )}
                          </form.Field>
                          <form.Field name={`exercises[${index}].weightUnit`}>
                            {(subField) => (
                              <select
                                value={subField.state.value}
                                onChange={(e) => subField.handleChange(e.target.value as "kg" | "lbs")}
                                onBlur={subField.handleBlur}
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                              >
                                <option value="kg">kg</option>
                                <option value="lbs">lbs</option>
                              </select>
                            )}
                          </form.Field>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <FieldLabel>Sets & Rest</FieldLabel>
                        <div className="flex space-x-2">
                          <form.Field name={`exercises[${index}].sets`}>
                            {(subField) => (
                              <Input
                                value={subField.state.value}
                                onChange={(e) => subField.handleChange(Number(e.target.value))}
                                onBlur={subField.handleBlur}
                                type="number"
                                placeholder="Sets"
                              />
                            )}
                          </form.Field>
                          <form.Field name={`exercises[${index}].restTime`}>
                            {(subField) => (
                              <Input
                                value={subField.state.value}
                                onChange={(e) => subField.handleChange(Number(e.target.value))}
                                onBlur={subField.handleBlur}
                                type="number"
                                placeholder="Rest(s)"
                              />
                            )}
                          </form.Field>
                        </div>
                      </div>

                      <div className="space-y-2 col-span-full">
                        <FieldLabel>Reps (comma separated for multiple sets)</FieldLabel>
                        <form.Field name={`exercises[${index}].reps`}>
                          {(subField) => (
                            <>
                              <Input
                                value={Array.isArray(subField.state.value) ? subField.state.value.join(", ") : ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value.trim()) {
                                    subField.handleChange(
                                      value
                                        .split(",")
                                        .map((n) => parseInt(n.trim()))
                                        .filter((n) => !isNaN(n))
                                    );
                                  } else {
                                    subField.handleChange([10]);
                                  }
                                }}
                                onBlur={subField.handleBlur}
                                placeholder="e.g. 10, 10, 8"
                              />
                              <FieldInfo field={subField} />
                            </>
                          )}
                        </form.Field>
                        <p className="text-xs text-muted-foreground">
                          Enter reps for each set, separated by commas
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </form.Field>

      <div className="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
        <form.Field name="exercises" mode="array">
          {(field) => (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                field.pushValue({
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
          )}
        </form.Field>
        <Button
          type="submit"
          disabled={isPending}
          className="w-full md:w-auto md:ml-auto"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Log Workout
        </Button>
      </div>
    </form>
  );
}
