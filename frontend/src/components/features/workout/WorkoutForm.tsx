"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import dayjs from "dayjs";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { FieldInfo } from "@/components/ui/form-field";
import { workoutApi } from "@/lib/api";
import { ExerciseSetInput } from "./ExerciseSetInput";
import { DATE_FORMATS } from "@/lib/constants";
import { Workout, WorkoutExercise, ExerciseSet } from "@/types";
import { WorkoutWithPerSetFormData } from "@/lib/validations/workout";
import { ApiErrorHandler } from "@/lib/error-handler";
import { useTranslations } from 'next-intl';

interface WorkoutFormProps {
  onSuccess?: () => void;
  workout?: Workout;
}

// Helper functions
const createDefaultExercise = (): WorkoutExercise => ({
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
});

const createDefaultSet = (): ExerciseSet => ({
  weight: 0,
  weightUnit: "kg" as const,
  reps: 10,
  restTime: 60,
  completed: false,
});

const combineDateTime = (date: Date, time: string): string => {
  const [hours, minutes] = time.split(":").map(Number);
  return dayjs(date)
    .hour(hours)
    .minute(minutes)
    .second(0)
    .millisecond(0)
    .toISOString();
};

const formatExercisesForApi = (exercises: WorkoutExercise[]) => {
  return exercises.map((exercise) => ({
    exerciseId: exercise.exerciseId,
    name: exercise.name,
    sets: exercise.sets.map(set => ({
      setId: "", // Backend will generate this
      weight: set.weight,
      weightUnit: "kg" as const,
      reps: set.reps,
      restTime: set.restTime || 60,
      completed: false,
    })),
  }));
};

export function WorkoutForm({ onSuccess, workout: initialWorkout }: WorkoutFormProps) {
  const queryClient = useQueryClient();
  const t = useTranslations('workout.form');
  const tCommon = useTranslations('common.actions');

  const form = useForm({
    defaultValues: {
      date: initialWorkout?.date ? new Date(initialWorkout.date) : new Date(),
      workoutTime: initialWorkout?.date ? dayjs(initialWorkout.date).format("HH:mm") : dayjs().format("HH:mm"),
      exercises: initialWorkout?.exercises ? initialWorkout.exercises : [createDefaultExercise()],
    },
    onSubmit: async ({ value }) => {
      createWorkout(value);
    },
  });

  // Mutation for creating workout
  const { mutate: createWorkout, isPending } = useMutation({
    mutationFn: async (data: WorkoutWithPerSetFormData) => {
      const combinedDate = combineDateTime(data.date, data.workoutTime);
      const exercises = formatExercisesForApi(data.exercises);

      return workoutApi.create({
        date: combinedDate,
        exercises: exercises,
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

  // Event handlers
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    form.handleSubmit();
  };

  const handleExerciseSelect = (selectedExercise: any, index: number, field: any) => {
    const newExercises = [...field.state.value];
    newExercises[index] = {
      ...newExercises[index],
      exerciseId: selectedExercise.exerciseId,
      name: selectedExercise.name,
    };
    field.setValue(newExercises);
  };

  const handleSetsChange = (sets: ExerciseSet[], index: number, field: any) => {
    const newExercises = [...field.state.value];
    newExercises[index] = {
      ...newExercises[index],
      sets: sets,
    };
    field.setValue(newExercises);
  };

  const handleAddExercise = (field: any) => {
    field.pushValue(createDefaultExercise());
  };

  return (
    <form
      onSubmit={handleFormSubmit}
      className="space-y-6"
    >
      <div className="flex flex-col space-y-2">
        <FieldLabel htmlFor="date">{t('date.label')}</FieldLabel>
        <div className="flex flex-wrap gap-4">
          <form.Field name="date">
            {(field) => (
              <Input
                value={dayjs(field.state.value).format(DATE_FORMATS.DATE_ONLY)}
                onChange={(e) => field.handleChange(dayjs(e.target.value).toDate())}
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
            {field.state.value.map((exercise, index) => (
              <Card key={`${exercise.exerciseId || 'new'}-${index}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold">
                      {exercise.name || t('exercise.fallback_name', { number: index + 1 })}
                    </CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => field.removeValue(index)}
                      disabled={field.state.value.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-2">
                    <form.Field name={`exercises[${index}].name`}>
                      {(subField) => (
                        <Input
                          value={exercise.name}
                          onChange={(e) => {
                            const newExercises = [...field.state.value];
                            newExercises[index] = {
                              ...newExercises[index],
                              name: e.target.value
                            };
                            field.setValue(newExercises);
                          }}
                          placeholder={t('exercise.name.placeholder')}
                          className="w-full"
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
                        onChange={(sets) => handleSetsChange(sets, index, field)}
                      />
                    )}
                  </form.Field>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </form.Field>

      <div className="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
        <form.Field name="exercises" mode="array">
          {(field) => (
            <Button
              type="button"
              variant="outline"
              onClick={() => handleAddExercise(field)}
              className="w-full md:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" /> {t('add_exercise')}
            </Button>
          )}
        </form.Field>
        <Button
          type="submit"
          disabled={isPending}
          className="w-full md:w-auto md:ml-auto"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('submit')}
        </Button>
      </div>
    </form>
  );
}
