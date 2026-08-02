import { Suspense } from "react";
import { getWorkoutPlanCached, getWorkoutPlanAssignmentsCached, verifySession } from "@/lib/dal";
import { WorkoutPlanDetailClient } from "./WorkoutPlanDetailClient";
import { DataError } from "@/components/features/DataError";
import { getTranslations } from "next-intl/server";
import type { WorkoutPlan, WorkoutPlanAssignment } from "@/types";

export default function TrainerWorkoutPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <WorkoutPlanDetailContent params={params} />
    </Suspense>
  );
}

async function WorkoutPlanDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("common");
  const session = await verifySession();
  const { id } = await params;
  let plan: WorkoutPlan;
  let assignments: WorkoutPlanAssignment[];
  try {
    const [planData, assignmentsData] = await Promise.all([
      getWorkoutPlanCached(session.accessToken, id),
      getWorkoutPlanAssignmentsCached(session.accessToken, id),
    ]);
    plan = planData;
    assignments = assignmentsData?.assignments || [];
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
