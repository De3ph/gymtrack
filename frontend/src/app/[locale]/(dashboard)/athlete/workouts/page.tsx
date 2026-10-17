import { Suspense } from "react";
import { getWorkoutPlanCached, verifySession } from "@/lib/dal";
import { WorkoutPlan } from "@/types";
import { WorkoutsClient } from "./WorkoutsClient";
import { DataError } from "@/components/features/DataError";
import { getTranslations } from "next-intl/server";

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
  // Translations, auth and the URL params are independent; resolve them
  // together instead of serialising three round-trips before render.
  const [t, session, { planId }] = await Promise.all([
    getTranslations("common"),
    verifySession(),
    searchParams,
  ]);

  let initialPlan: WorkoutPlan | undefined;
  // The plan is handed to the client form as-is. Building a fake Workout here
  // (with `new Date()` timestamps) made the RSC non-deterministic; the form
  // already owns "now" for a fresh workout.
  let initialPlanName: string | null = null;

  if (planId) {
    try {
      initialPlan = await getWorkoutPlanCached(session.accessToken, planId);
      initialPlanName = initialPlan.name;
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
      initialPlan={initialPlan}
      initialPlanName={initialPlanName}
      planId={planId || null}
    />
  );
}
