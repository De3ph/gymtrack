"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Dumbbell, Save, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const ExerciseSelector = dynamic(
  () =>
    import("@/components/features/exercise/ExerciseSelector").then(
      (m) => m.ExerciseSelector,
    ),
  { ssr: false, loading: () => <Skeleton className="h-9 w-28" /> },
);
import { PlanSetInput } from "./PlanSetInput";
import { WorkoutPlan, WorkoutPlanExercise, WorkoutPlanSet } from "@/types";
import { workoutPlanApi } from "@/lib/api";
import { ApiErrorHandler } from "@/lib/error-handler";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { revalidateWorkoutPlansCache } from "@/lib/actions/cache";

interface WorkoutPlanFormProps {
  onSuccess?: () => void;
  plan?: WorkoutPlan;
  namespace?: "trainer.workout_plans" | "athlete.workout_plans";
}

const createDefaultExercise = (): WorkoutPlanExercise => ({
  exerciseId: 0,
  name: "",
  sets: [{ weight: 0, weightUnit: "kg", reps: 10, restTime: 60 }],
  notes: "",
  order: 0,
});

export function WorkoutPlanForm({
  onSuccess,
  plan,
  namespace,
}: WorkoutPlanFormProps) {
  const queryClient = useQueryClient();
  const t = useTranslations(namespace ?? "trainer.workout_plans");

  const [name, setName] = useState(plan?.name || "");
  const [description, setDescription] = useState(plan?.description || "");
  const [exercises, setExercises] = useState<WorkoutPlanExercise[]>(
    plan?.exercises || [createDefaultExercise()],
  );

  const isEditing = !!plan;

  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const data = {
        name,
        description,
        exercises: exercises.map((ex, i) => ({ ...ex, order: i })),
      };
      if (plan) {
        return workoutPlanApi.update(plan.planId, data);
      }
      return workoutPlanApi.create(data);
    },
    onSuccess: async () => {
      await revalidateWorkoutPlansCache();
      await queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
      setName("");
      setDescription("");
      setExercises([createDefaultExercise()]);
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      ApiErrorHandler.handle(error);
    },
  });

  const handleExerciseSelect = (
    selected: { exerciseId: string | number; name: string },
    index: number,
  ) => {
    const newExercises = [...exercises];
    newExercises[index] = {
      ...newExercises[index],
      exerciseId: Number(selected.exerciseId),
      name: selected.name,
    };
    setExercises(newExercises);
  };

  const handleSetsChange = (sets: WorkoutPlanSet[], index: number) => {
    const newExercises = [...exercises];
    newExercises[index] = { ...newExercises[index], sets };
    setExercises(newExercises);
  };

  const removeExercise = (index: number) => {
    const newExercises = exercises.filter((_, i) => i !== index);
    setExercises(
      newExercises.length ? newExercises : [createDefaultExercise()],
    );
  };

  const addExercise = () => {
    setExercises([...exercises, createDefaultExercise()]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Hero — plan identity */}
      <div className="">
        <div
          className="absolute inset-y-0 left-0 w-0.5 bg-primary"
          aria-hidden
        />
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("plan_name")}
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("exercise_name_placeholder")}
              required
              className="h-11 border-transparent bg-muted/40 px-3 text-base font-medium focus-visible:border-primary/60 focus-visible:bg-background"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("description_label")}
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("description_placeholder")}
              className="min-h-16 border-transparent bg-muted/40 px-3 focus-visible:border-primary/60 focus-visible:bg-background"
            />
          </div>
        </div>
      </div>

      {/* Exercises section */}
      <div className="space-y-6">
        {exercises.map((exercise, index) => (
          <div
            key={`${exercise.exerciseId || "new"}-${index}`}
            className="group relative overflow-hidden rounded-xl border bg-card shadow-xs transition-colors hover:border-primary/40"
          >
            {/* Index chip + accent */}
            <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-heading text-sm font-bold tabular-nums text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="truncate font-medium">
                  {exercise.name ||
                    t("fallback_exercise_name", { index: index + 1 })}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => removeExercise(index)}
                disabled={exercises.length === 1}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            <div className="space-y-4 p-4">
              <ExerciseSelector
                onSelect={(selected) =>
                  handleExerciseSelect(
                    { exerciseId: selected.exerciseId, name: selected.name },
                    index,
                  )
                }
              />

              <div className="space-y-2">
                <div className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {exercise.sets.length} set
                  {exercise.sets.length === 1 ? "" : "s"}
                </div>
                <PlanSetInput
                  value={exercise.sets}
                  onChange={(sets) => handleSetsChange(sets, index)}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("notes_placeholder")}
                </label>
                <Input
                  value={exercise.notes || ""}
                  onChange={(e) => {
                    const newExercises = [...exercises];
                    newExercises[index] = {
                      ...newExercises[index],
                      notes: e.target.value,
                    };
                    setExercises(newExercises);
                  }}
                  placeholder={t("notes_placeholder")}
                  className="text-sm"
                />
              </div>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={addExercise}
          className="w-full border-dashed py-6 text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
        >
          <Plus className="mr-2 size-4" /> {t("add_exercise")}
        </Button>
      </div>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 -mx-6 -mb-6 border-t bg-popover/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-popover/80">
        <div className="flex items-center justify-between gap-4">
          <div className="text-md text-foreground sm:block">
            {exercises.length} {t("exercises").toLowerCase()} · {totalSets}{" "}
            {totalSets === 1 ? "set" : "sets"}
          </div>
          <Button type="submit" disabled={isPending} className="min-w-40 gap-2">
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isEditing ? (
              <Save className="size-4" />
            ) : (
              <Dumbbell className="size-4" />
            )}
            {isEditing ? t("plan_update") : t("plan_create")}
          </Button>
        </div>
      </div>
    </form>
  );
}
