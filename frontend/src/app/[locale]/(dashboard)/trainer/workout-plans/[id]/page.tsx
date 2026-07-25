import { getWorkoutPlanCached, getWorkoutPlanAssignmentsCached } from "@/lib/dal";
import { WorkoutPlanDetailClient } from "./WorkoutPlanDetailClient";
import { DataError } from "@/components/features/DataError";
import { getTranslations } from "next-intl/server";

export default async function TrainerWorkoutPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("common");
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
        title={t("errors.failed_load_workout_plan")}
        message={
          err instanceof Error ? err.message : t("errors.unexpected_error")
        }
      />
    );
  }
  return (
    <WorkoutPlanDetailClient plan={plan} assignments={assignments} planId={id} />
  );
}
