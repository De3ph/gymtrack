"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { workoutPlanApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { ApiErrorHandler } from "@/lib/error-handler";
import { revalidateWorkoutPlansCache } from "@/lib/actions/cache";
import { toast } from "@/components/ui/toast";
import type { WorkoutPlanExercise, WorkoutPlanSet } from "@/types";

export interface AddExerciseToPlanInput {
  /** Plan the exercise is appended to. Must be owned by the signed-in user. */
  planId: number;
  exercise: { exerciseId: number; name: string };
  sets: WorkoutPlanSet[];
}

/**
 * Appends an exercise to one of the user's own workout plans.
 *
 * The backend exposes no "append exercise" endpoint — a plan is written as a
 * whole document — so the plan is re-read before it is written back. That
 * read is what keeps a copy cached in the client from overwriting a plan that
 * was already changed on the server.
 *
 * It is not a lock. A change that lands between the read and the write is
 * still lost, because the write replaces the whole plan. Closing that window
 * needs an append endpoint on the backend.
 */
export function useAddExerciseToPlan() {
  const queryClient = useQueryClient();
  const t = useTranslations("exercise.add_to_plan");

  return useMutation({
    mutationFn: async ({ planId, exercise, sets }: AddExerciseToPlanInput) => {
      const plan = await workoutPlanApi.getById(planId);

      // The new exercise goes last, so its order continues the sequence the
      // plan already uses.
      const nextOrder =
        plan.exercises.reduce(
          (max, planExercise) => Math.max(max, planExercise.order),
          -1,
        ) + 1;

      const added: WorkoutPlanExercise = {
        exerciseId: exercise.exerciseId,
        name: exercise.name,
        sets,
        order: nextOrder,
      };

      return workoutPlanApi.update(plan.planId, {
        name: plan.name,
        description: plan.description ?? "",
        exercises: [...plan.exercises, added],
      });
    },
    onSuccess: async (updatedPlan, variables) => {
      await revalidateWorkoutPlansCache();
      await queryClient.invalidateQueries({ queryKey: qk.plans.all });
      toast.add({
        type: "success",
        title: t("added_title"),
        description: t("added_description", {
          name: variables.exercise.name,
          plan: updatedPlan.name,
        }),
      });
    },
    onError: (error) => {
      toast.add({
        type: "error",
        title: t("error_title"),
        description: ApiErrorHandler.handle(error),
      });
    },
  });
}
