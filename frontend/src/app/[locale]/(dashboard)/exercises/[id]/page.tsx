import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  getEquipmentCached,
  getExerciseByIdCached,
  getMuscleGroupsCached,
  verifySession,
} from "@/lib/dal";
import type { Equipment, MuscleGroup } from "@/types";
import { DataError } from "@/components/features/DataError";
import { ExerciseDetailClient } from "./_components/ExerciseDetailClient";

export default function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <ExerciseDetailContent params={params} />
    </Suspense>
  );
}

async function ExerciseDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("common");
  const { id } = await params;

  // The id arrives from the URL, so it cannot be trusted to be numeric. The
  // backend would answer 400 for anything else; checking here avoids a pointless
  // round trip and keeps a mistyped link a 404 rather than an error page.
  if (!/^\d+$/.test(id)) {
    notFound();
  }

  const session = await verifySession();

  // getExerciseByIdCached returns null only when the backend genuinely answered
  // 404; every other failure rejects. Keeping the two apart here is what stops a
  // backend outage from being reported to the user as "this exercise does not
  // exist", which is both wrong and unactionable.
  let exercise;
  let muscleGroups: MuscleGroup[];
  let equipment: Equipment[];
  try {
    [exercise, muscleGroups, equipment] = await Promise.all([
      getExerciseByIdCached(session.accessToken, id),
      getMuscleGroupsCached(session.accessToken),
      getEquipmentCached(session.accessToken),
    ]);
  } catch (err) {
    return (
      <DataError
        title={t("errors.failed_load_exercises")}
        message={err instanceof Error ? err.message : t("errors.unexpected_error")}
      />
    );
  }

  if (!exercise) {
    notFound();
  }

  // Only the two lookup tables needed to label this one row. The full catalog is
  // not fetched here: the detail page has no use for it.
  const muscleGroup: MuscleGroup | undefined = muscleGroups.find(
    (group) => group.id === exercise.muscleGroupId,
  );
  const equipmentItem: Equipment | undefined = equipment.find(
    (item) => item.id === exercise.equipmentId,
  );

  return (
    <ExerciseDetailClient
      exercise={{ ...exercise, muscleGroup, equipment: equipmentItem }}
    />
  );
}