"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { Dumbbell, SearchX } from "lucide-react";
import type { Equipment, ExerciseLibrary, MuscleGroup } from "@/types";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { ExerciseLibraryCard } from "@/components/features/exercise/ExerciseLibraryCard";
import {
  ExerciseLibraryFilters,
  type ExerciseLibraryFilterState,
} from "@/components/features/exercise/ExerciseLibraryFilters";
import {
  exerciseCardReveal,
  exerciseRevealReduced,
} from "@/components/features/exercise/exercise-variants";
import { MotionProvider } from "@/components/ui/motion-provider";

interface ExercisesClientProps {
  exercises: ExerciseLibrary[];
  muscleGroups: MuscleGroup[];
  equipment: Equipment[];
}

const EMPTY_FILTERS: ExerciseLibraryFilterState = { query: "" };

/**
 * Cards mounted per "load more" click: one screen and a half on a wide grid, so
 * the click always visibly does something, small enough that mounting a batch
 * stays well inside a frame budget, and a round multiple of the 3-column layout.
 */
const BATCH_SIZE = 48;

const GRID_ID = "exercise-library-grid";

/** Filter edits and load-more clicks collapse into a single history write. */
const URL_SYNC_DELAY_MS = 300;

/**
 * Reads the "load more" window out of the URL.
 *
 * The window is view state, not navigation state, but it still has to live in
 * the URL: without it, returning from an exercise detail page restores the
 * scroll offset against a list that has collapsed back to the first batch, and
 * the browser clamps the viewer to a much shorter page.
 */
function parseVisibleCount(raw: string | null): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= BATCH_SIZE) return BATCH_SIZE;
  return Math.floor(parsed);
}

/** Writes a param, or removes it when the value is empty/default. */
function setOrDelete(
  params: URLSearchParams,
  key: string,
  value: string | number | undefined,
) {
  const text = value === undefined ? "" : String(value).trim();
  if (text === "") params.delete(key);
  else params.set(key, text);
}

export function ExercisesClient({
  exercises,
  muscleGroups,
  equipment,
}: ExercisesClientProps) {
  const t = useTranslations("exercise.library");
  const tFilters = useTranslations("exercise.filters");
  const searchParams = useSearchParams();
  const pathname = usePathname();
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

  // How many cards are mounted. The whole catalog stays in memory — that is what
  // makes filtering instant and category filtering possible at all — so the
  // only thing worth windowing is the DOM.
  const [visibleCount, setVisibleCount] = useState(() =>
    parseVisibleCount(searchParams.get("shown")),
  );

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

  const visible = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );
  const remaining = filtered.length - visible.length;

  // Mirrors the view into the URL with the native History API rather than
  // router.replace: the catalog is already in memory, so an RSC round trip per
  // keystroke buys nothing and would risk swapping the Suspense boundary out
  // from under the list. This is what makes Back from a detail page land on the
  // same filters and scroll depth instead of a reset page 1.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setOrDelete(params, "q", filters.query);
    setOrDelete(params, "muscle", filters.muscleGroupId);
    setOrDelete(params, "equipment", filters.equipmentId);
    setOrDelete(params, "category", filters.category);
    // Kept out of the URL while the default window is showing, so a plain visit
    // stays a clean /exercises link.
    setOrDelete(
      params,
      "shown",
      visibleCount > BATCH_SIZE ? visibleCount : undefined,
    );

    const query = params.toString();
    const timer = window.setTimeout(() => {
      window.history.replaceState(
        null,
        "",
        query ? `${pathname}?${query}` : pathname,
      );
    }, URL_SYNC_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [filters, visibleCount, pathname]);

  const handleFilterChange = useCallback((next: ExerciseLibraryFilterState) => {
    setFilters(next);
    // A narrower result set would otherwise leave the viewer scrolled past the
    // end of a list that no longer exists.
    setVisibleCount(BATCH_SIZE);
  }, []);

  const handleLoadMore = useCallback(() => {
    setVisibleCount((current) => current + BATCH_SIZE);
  }, []);

  return (
    <MotionProvider>
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
          visibleCount={visible.length}
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
                onClick={() => handleFilterChange(EMPTY_FILTERS)}
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                {tFilters("clear")}
              </button>
            )}
          </Empty>
        ) : (
          <>
            <div
              id={GRID_ID}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {visible.map((exercise, index) => (
                // Each card owns its reveal: a container stagger would derive
                // the delay from the index, so the 870th tile would wait ~26s
                // and every appended batch would replay the ramp.
                <m.div
                  key={exercise.exerciseId}
                  variants={
                    reducedMotion ? exerciseRevealReduced : exerciseCardReveal(index)
                  }
                  initial="hidden"
                  animate="visible"
                >
                  <ExerciseLibraryCard exercise={exercise} />
                </m.div>
              ))}
            </div>

            {remaining > 0 && (
              <div className="flex justify-center pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  aria-controls={GRID_ID}
                  className="rounded-none border-border font-mono text-[11px] uppercase tracking-[0.18em] text-foreground hover:bg-muted"
                >
                  {t("load_more")}
                  <span className="text-muted-foreground" aria-hidden="true">
                    +{Math.min(BATCH_SIZE, remaining)}
                  </span>
                </Button>
              </div>
            )}
          </>
        )}

        {exercises.length === 0 && (
          <p className="flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <Dumbbell className="size-5" aria-hidden="true" />
            {t("catalog_empty")}
          </p>
        )}
      </div>
    </MotionProvider>
  );
}
