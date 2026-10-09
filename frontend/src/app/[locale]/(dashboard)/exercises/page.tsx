import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import {
  getEquipmentCached,
  getExercisesCatalogCached,
  getMuscleGroupsCached,
  verifySession,
} from "@/lib/dal";
import type { Equipment, ExerciseLibrary, MuscleGroup } from "@/types";
import { DataError } from "@/components/features/DataError";
import { ExerciseLibrarySkeleton } from "@/components/features/exercise/ExerciseLibrarySkeleton";
import { ExercisesClient } from "./_components/ExercisesClient";

export default function ExercisesPage() {
  return (
    <Suspense fallback={<ExercisesFallback />}>
      <ExercisesContent />
    </Suspense>
  );
}

function ExercisesFallback() {
  return (
    <div className="container mx-auto py-6">
      <div className="h-8 w-56 animate-pulse bg-muted" />
      <div className="mt-6">
        <ExerciseLibrarySkeleton />
      </div>
    </div>
  );
}

async function ExercisesContent() {
  const t = await getTranslations("common");
  const session = await verifySession();

  // The catalog is reference data: identical for every user and already cached
  // for an hour server-side. One round trip here means the grid is painted with
  // real cards on first paint, with no client refetch and no loading flash.
  let exercises: ExerciseLibrary[];
  let muscleGroups: MuscleGroup[];
  let equipment: Equipment[];
  try {
    [exercises, muscleGroups, equipment] = await Promise.all([
      getExercisesCatalogCached(session.accessToken),
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

  // The exercise endpoints return bare rows carrying only foreign keys, so the
  // muscle-group and equipment labels are resolved here once rather than in
  // every card. Both lookups are built as Maps because the grid maps over the
  // catalog on every filter keystroke — a linear scan per card would make
  // typing O(n·m).
  const muscleGroupById = new Map(muscleGroups.map((group) => [group.id, group]));
  const equipmentById = new Map(equipment.map((item) => [item.id, item]));

  const enriched: ExerciseLibrary[] = exercises.map((exercise) => ({
    ...exercise,
    muscleGroup: muscleGroupById.get(exercise.muscleGroupId),
    equipment: equipmentById.get(exercise.equipmentId),
  }));

  return (
    <ExercisesClient
      exercises={enriched}
      muscleGroups={muscleGroups}
      equipment={equipment}
    />
  );
}