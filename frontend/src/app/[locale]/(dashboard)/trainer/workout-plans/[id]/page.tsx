import { getWorkoutPlanCached, getWorkoutPlanAssignmentsCached } from "@/lib/dal";
import { WorkoutPlanDetailClient } from "./WorkoutPlanDetailClient";

export default async function TrainerWorkoutPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plan = await getWorkoutPlanCached(id);
  const assignmentsData = await getWorkoutPlanAssignmentsCached(id);
  const assignments = assignmentsData?.assignments || [];
  return <WorkoutPlanDetailClient plan={plan} assignments={assignments} planId={id} />;
}
