import { getWorkoutPlanCached } from "@/lib/dal";
import { WorkoutPlan } from "@/types";
import { Workout, WorkoutExercise } from "@/types";
import { WorkoutsClient } from "./WorkoutsClient";

function buildWorkoutFromPlan(plan: WorkoutPlan): Workout {
  const exercises: WorkoutExercise[] = plan.exercises.map((pe) => ({
    exerciseId: pe.exerciseId,
    name: pe.name,
    notes: pe.notes,
    sets: pe.sets.map((ps) => ({
      setId: ps.setId ?? undefined,
      weight: ps.weight,
      weightUnit: ps.weightUnit,
      reps: ps.reps,
      restTime: ps.restTime,
      completed: false,
    })),
  }));

  return {
    workoutId: 0,
    athleteId: 0,
    date: new Date().toISOString(),
    exercises,
    planId: plan.planId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default async function WorkoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ planId?: string }>;
}) {
  const { planId } = await searchParams;
  let initialWorkout: Workout | undefined;
  if (planId) {
    const plan = await getWorkoutPlanCached(planId);
    if (plan) {
      initialWorkout = buildWorkoutFromPlan(plan as WorkoutPlan);
    }
  }
  return <WorkoutsClient initialWorkout={initialWorkout} planId={planId || null} />;
}
