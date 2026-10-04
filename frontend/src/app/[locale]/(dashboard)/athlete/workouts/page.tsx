import { Suspense } from "react";
import { getWorkoutPlanCached, verifySession } from "@/lib/dal";
import { WorkoutPlan } from "@/types";
import { Workout, WorkoutExercise } from "@/types";
import { WorkoutsClient } from "./WorkoutsClient";
import { DataError } from "@/components/features/DataError";
import { getTranslations } from "next-intl/server";

function buildWorkoutFromPlan(plan: WorkoutPlan): Workout {
  const exercises: WorkoutExercise[] = plan.exercises.map((pe) => ({
    exerciseId: pe.exerciseId,
    name: pe.name,
    notes: pe.notes,
    sets: pe.sets.map((ps) => ({
      setId: ps.setId != null ? String(ps.setId) : undefined,
      weight: ps.weight,
      weightUnit: ps.weightUnit,
      reps: ps.reps,
      restTime: ps.restTime,
      completed: false,
    })),
  }));

  return {
    type: "workout",
    workoutId: 0,
    athleteId: 0,
    date: new Date().toISOString(),
    exercises,
    planId: plan.planId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default function WorkoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ planId?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <WorkoutsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function WorkoutsContent({
  searchParams,
}: {
  searchParams: Promise<{ planId?: string }>;
}) {
  const t = await getTranslations("common");
  const session = await verifySession();
  const { planId } = await searchParams;
  let initialWorkout: Workout | undefined;
  // Carried alongside the workout so the client can name the plan in its
  // "plan loaded" confirmation. The client can't reliably re-derive it: the
  // name would have to come from the plan list, and an athlete's *own* plan is
  // absent from /workout-plans/assigned. The plan is already in hand here.
  let initialPlanName: string | null = null;
  if (planId) {
    try {
      const plan = await getWorkoutPlanCached(session.accessToken, planId);
      if (plan) {
        initialWorkout = buildWorkoutFromPlan(plan);
        initialPlanName = plan.name;
      }
    } catch (err) {
      return (
        <DataError
          title={t("errors.failed_load_workout_plan")}
          message={
            err instanceof Error
              ? err.message
              : t("errors.unexpected_error")
          }
        />
      );
    }
  }
  return (
    <WorkoutsClient
      initialWorkout={initialWorkout}
      initialPlanName={initialPlanName}
      planId={planId || null}
    />
  );
}
