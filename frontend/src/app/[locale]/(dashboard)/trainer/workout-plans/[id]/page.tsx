import { getWorkoutPlanCached, getWorkoutPlanAssignmentsCached } from "@/lib/dal";
import { WorkoutPlanDetailClient } from "./WorkoutPlanDetailClient";
import { DataError } from "@/components/features/DataError";

export default async function TrainerWorkoutPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let plan: Record<string, unknown>;
  let assignments: unknown[];
  try {
    const [planData, assignmentsData] = await Promise.all([
      getWorkoutPlanCached(id),
      getWorkoutPlanAssignmentsCached(id),
    ]);
    plan = planData as Record<string, unknown>;
    assignments = (assignmentsData?.assignments as unknown[]) || [];
  } catch (err) {
    return (
      <DataError
        title="Failed to load workout plan"
        message={
          err instanceof Error ? err.message : "An unexpected error occurred"
        }
      />
    );
  }
  return (
    <WorkoutPlanDetailClient plan={plan} assignments={assignments} planId={id} />
  );
}
