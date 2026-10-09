"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Dumbbell, SearchX } from "lucide-react";
import type { Equipment, ExerciseLibrary, MuscleGroup } from "@/types";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { ExerciseLibraryCard } from "@/components/features/exercise/ExerciseLibraryCard";
import {
  ExerciseLibraryFilters,
  type ExerciseLibraryFilterState,
} from "@/components/features/exercise/ExerciseLibraryFilters";
import {
  exerciseReveal,
  exerciseRevealReduced,
  exerciseStagger,
} from "@/components/features/exercise/exercise-variants";

interface ExercisesClientProps {
  exercises: ExerciseLibrary[];
  muscleGroups: MuscleGroup[];
  equipment: Equipment[];
}

const EMPTY_FILTERS: ExerciseLibraryFilterState = { query: "" };

export function ExercisesClient({
  exercises,
  muscleGroups,
  equipment,
}: ExercisesClientProps) {
  const t = useTranslations("exercise.library");
  const tFilters = useTranslations("exercise.filters");
  const searchParams = useSearchParams();
  const reducedMotion = useReducedMotion();

  // Filters are seeded from the URL so a shared link lands on the same view,
  // but subsequent changes stay in component state: writing every keystroke
  // back to the URL would push a history entry per character and re-run the
  // server component for a purely client-side filter.
  const [filters, setFilters] = useState<ExerciseLibraryFilterState>(() => {
    const query = searchParams.get("q") ?? "";
    const muscleGroupId = searchParams.get("muscle");
    const equipmentId = searchParams.get("equipment");
    const category = searchParams.get("category");
    return {
      query,
      muscleGroupId: muscleGroupId ? Number(muscleGroupId) : undefined,
      equipmentId: equipmentId ? Number(equipmentId) : undefined,
      category: category ?? undefined,
    };
  });

  // Keeps typing responsive: the input updates at once, the (larger) filter
  // pass runs against the deferred value.
  const deferredQuery = useDeferredValue(filters.query);

  const categories = useMemo(() => {
    const unique = new Set<string>();
    for (const exercise of exercises) {
      if (exercise.category) unique.add(exercise.category);
    }
    return [...unique].sort();
  }, [exercises]);

  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();

    return exercises.filter((exercise) => {
      if (
        needle &&
        !exercise.name.toLowerCase().includes(needle) &&
        !(exercise.instructions ?? "").toLowerCase().includes(needle)
      ) {
        return false;
      }
      if (
        filters.muscleGroupId !== undefined &&
        exercise.muscleGroupId !== filters.muscleGroupId
      ) {
        return false;
      }
      if (
        filters.equipmentId !== undefined &&
        exercise.equipmentId !== filters.equipmentId
      ) {
        return false;
      }
      if (filters.category !== undefined && exercise.category !== filters.category) {
        return false;
      }
      return true;
    });
  }, [
    exercises,
    deferredQuery,
    filters.muscleGroupId,
    filters.equipmentId,
    filters.category,
  ]);

  const handleFilterChange = useCallback((next: ExerciseLibraryFilterState) => {
    setFilters(next);
  }, []);

  const itemVariants = reducedMotion ? exerciseRevealReduced : exerciseReveal;

  return (
    <div className="container mx-auto space-y-6 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </header>

      <ExerciseLibraryFilters
        value={filters}
        categories={categories}
        muscleGroups={muscleGroups}
        equipment={equipment}
        resultCount={filtered.length}
        totalCount={exercises.length}
        onChange={handleFilterChange}
      />

      {filtered.length === 0 ? (
        <Empty className="rounded-none border border-border">
          <EmptyHeader>
            <SearchX className="size-5 text-muted-foreground" aria-hidden="true" />
            <EmptyTitle className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground">
              {tFilters("no_results")}
            </EmptyTitle>
            <EmptyDescription>
              {exercises.length === 0 ? t("catalog_empty") : t("no_results_hint")}
            </EmptyDescription>
          </EmptyHeader>
          {exercises.length > 0 && (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              {tFilters("clear")}
            </button>
          )}
        </Empty>
      ) : (
        <motion.div
          variants={exerciseStagger}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((exercise) => (
            <motion.div key={exercise.exerciseId} variants={itemVariants}>
              <ExerciseLibraryCard exercise={exercise} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {exercises.length === 0 && (
        <p className="flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <Dumbbell className="size-5" aria-hidden="true" />
          {t("catalog_empty")}
        </p>
      )}
    </div>
  );
}