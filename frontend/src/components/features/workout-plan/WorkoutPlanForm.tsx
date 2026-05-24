"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ExerciseSelector } from "@/components/features/exercise/ExerciseSelector";
import { PlanSetInput } from "./PlanSetInput";
import { WorkoutPlan, WorkoutPlanExercise, WorkoutPlanSet } from "@/types";
import { workoutPlanApi } from "@/lib/api";
import { ApiErrorHandler } from "@/lib/error-handler";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface WorkoutPlanFormProps {
  onSuccess?: () => void;
  plan?: WorkoutPlan;
}

const createDefaultExercise = (): WorkoutPlanExercise => ({
  exerciseId: "",
  name: "",
  sets: [{ weight: 0, weightUnit: "kg", reps: 10, restTime: 60 }],
  notes: "",
  order: 0,
});

export function WorkoutPlanForm({ onSuccess, plan }: WorkoutPlanFormProps) {
  const queryClient = useQueryClient();
  const t = useTranslations("trainer.workout_plans");

  const [name, setName] = useState(plan?.name || "");
  const [description, setDescription] = useState(plan?.description || "");
  const [exercises, setExercises] = useState<WorkoutPlanExercise[]>(
    plan?.exercises || [createDefaultExercise()]
  );

  const isEditing = !!plan;

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

  const handleExerciseSelect = (selected: { exerciseId: string; name: string }, index: number) => {
    const newExercises = [...exercises];
    newExercises[index] = { ...newExercises[index], exerciseId: selected.exerciseId, name: selected.name };
    setExercises(newExercises);
  };

  const handleSetsChange = (sets: WorkoutPlanSet[], index: number) => {
    const newExercises = [...exercises];
    newExercises[index] = { ...newExercises[index], sets };
    setExercises(newExercises);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("plan_name")}</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Push Day A"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t("description")}</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description..."
        />
      </div>

      <div className="space-y-4">
        <h3 className="font-medium">{t("exercises")}</h3>
        {exercises.map((exercise, index) => (
          <Card key={`${exercise.exerciseId || "new"}-${index}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {exercise.name || `Exercise ${index + 1}`}
                </CardTitle>
                <Button
                  type="button" variant="ghost" size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    const newExercises = exercises.filter((_, i) => i !== index);
                    setExercises(newExercises.length ? newExercises : [createDefaultExercise()]);
                  }}
                  disabled={exercises.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2">
                <ExerciseSelector
                  value={exercise.name}
                  onSelect={(selected) => handleExerciseSelect(
                    { exerciseId: selected.exerciseId, name: selected.name },
                    index
                  )}
                />
              </div>
            </CardHeader>
            <CardContent>
              <PlanSetInput
                value={exercise.sets}
                onChange={(sets) => handleSetsChange(sets, index)}
              />
              <div className="mt-2">
                <Input
                  value={exercise.notes || ""}
                  onChange={(e) => {
                    const newExercises = [...exercises];
                    newExercises[index] = { ...newExercises[index], notes: e.target.value };
                    setExercises(newExercises);
                  }}
                  placeholder="Notes / instructions for this exercise..."
                  className="text-sm"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
        <Button
          type="button" variant="outline"
          onClick={() => setExercises([...exercises, createDefaultExercise()])}
        >
          <Plus className="mr-2 h-4 w-4" /> {t("add_exercise")}
        </Button>
        <Button type="submit" disabled={isPending} className="w-full md:w-auto md:ml-auto">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Update Plan" : "Create Plan"}
        </Button>
      </div>
    </form>
  );
}
