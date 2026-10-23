"use client";

import { useState, useCallback, useMemo, useDeferredValue } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import { Search, Dumbbell, SearchX, Check } from "lucide-react";
import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { exerciseApi } from "@/lib/api";
import { useExerciseCatalogStore } from "@/stores/exercise-catalog-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  ItemGroup,
  ItemMedia,
} from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { MuscleGroupBadge } from "./MuscleGroupBadge";
import { EquipmentBadge } from "./EquipmentBadge";
import { ExerciseFilters } from "./exercise-selector/ExerciseFilters";
import {
  exerciseReveal,
  exerciseRevealReduced,
  exerciseStagger,
} from "./exercise-variants";
import { ExerciseLibrary, ExerciseSearchParams } from "@/types";
import { STALE_TIMES } from "@/lib/api/api-constants";
import { MotionProvider } from "@/components/ui/motion-provider";

interface ExerciseSelectorProps {
  onSelect: (exercise: ExerciseLibrary) => void;
  /** Currently picked exercise, marked in the result list. */
  selectedExerciseId?: string | number;
  /** Current exercise name, shown on the trigger once one is picked. */
  selectedName?: string;
  disabled?: boolean;
  /**
   * Controlled open state for the picker dialog. When provided, the parent
   * drives visibility (e.g. to auto-open the picker right after an exercise
   * row is added).
   */
  open?: boolean;
  /** Called whenever the dialog open state changes (controlled mode). */
  onOpenChange?: (open: boolean) => void;
}

export function ExerciseSelector({
  onSelect,
  selectedExerciseId,
  selectedName,
  disabled = false,
  open,
  onOpenChange,
}: ExerciseSelectorProps) {
  const t = useTranslations("exercise");
  const reducedMotion = useReducedMotion();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = open !== undefined;
  const isDialogOpen = isControlled ? open : uncontrolledOpen;
  const setIsDialogOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );
  const {
    searchQuery,
    selectedMuscleGroup,
    selectedEquipment,
    setSearchQuery,
    setSelectedMuscleGroup,
    setSelectedEquipment,
  } = useExerciseCatalogStore();

  const deferredSearch = useDeferredValue(searchQuery);
  const debouncedSearch = useDebounce(deferredSearch, 300);

  const {
    data: muscleGroupsData,
    isLoading: isLoadingMuscleGroups,
    error: muscleGroupsError,
  } = useQuery({
    queryKey: qk.exercises.muscleGroups,
    queryFn: () => exerciseApi.getMuscleGroups(),
    staleTime: STALE_TIMES.TWELVE_HOURS,
  });

  const {
    data: equipmentData,
    isLoading: isLoadingEquipment,
    error: equipmentError,
  } = useQuery({
    queryKey: qk.exercises.equipment,
    queryFn: () => exerciseApi.getEquipment(),
    staleTime: STALE_TIMES.TWELVE_HOURS,
  });

  const searchParams: ExerciseSearchParams = useMemo(() => {
    const params: ExerciseSearchParams = {};
    if (debouncedSearch) params.query = debouncedSearch;
    if (selectedMuscleGroup) params.muscleGroupId = selectedMuscleGroup;
    if (selectedEquipment) params.equipmentId = selectedEquipment;
    params.limit = 20;
    return params;
  }, [debouncedSearch, selectedMuscleGroup, selectedEquipment]);

  const { data: exercisesData, isLoading: isLoadingExercises } = useQuery({
    queryKey: qk.exercises.search(searchParams),
    queryFn: () => exerciseApi.search(searchParams),
    enabled: isDialogOpen,
    staleTime: STALE_TIMES.FIVE_MINUTES,
  });

  const handleSelect = useCallback(
    (exercise: ExerciseLibrary) => {
      onSelect(exercise);
      setIsDialogOpen(false);
    },
    [onSelect, setIsDialogOpen],
  );

  const clearFilters = useCallback(() => {
    setSelectedMuscleGroup(undefined);
    setSelectedEquipment(undefined);
    setSearchQuery("");
  }, [setSelectedMuscleGroup, setSelectedEquipment, setSearchQuery]);

  const muscleGroups = muscleGroupsData || [];
  const equipment = equipmentData || [];

  const hasError = muscleGroupsError || equipmentError;
  const isLoading = isLoadingMuscleGroups || isLoadingEquipment;

  const exercises = useMemo(
    () =>
      (exercisesData ?? []).map((exercise: ExerciseLibrary) => ({
        ...exercise,
        muscleGroup: (muscleGroupsData ?? []).find(
          (mg) => mg.id === exercise.muscleGroupId,
        ),
        equipment: (equipmentData ?? []).find(
          (eq) => eq.id === exercise.equipmentId,
        ),
      })),
    [exercisesData, muscleGroupsData, equipmentData],
  );

  const itemVariants = reducedMotion ? exerciseRevealReduced : exerciseReveal;

  // Rows hold ids as strings while the API returns numbers; compare as text.
  const selectedId =
    selectedExerciseId != null && selectedExerciseId !== ""
      ? String(selectedExerciseId)
      : null;

  return (
    <MotionProvider>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={disabled}
              className={cn(
                "max-w-56 rounded-none font-mono shadow-none",
                selectedName
                  ? "text-xs tracking-normal"
                  : "text-[10px] uppercase tracking-[0.18em]",
              )}
            >
              <Dumbbell
                className="size-5 shrink-0 transition-transform duration-200 ease-out motion-safe:group-hover/button:-rotate-6"
                aria-hidden="true"
              />
              <span className="truncate">
                {selectedName || t("selector.pick_exercise")}
              </span>
            </Button>
          }
        />
        <DialogContent className="min-w-[50dvw] max-h-[80vh] overflow-y-auto rounded-none border border-border p-0 text-foreground shadow-none ring-0">
          <DialogHeader className="border-b border-border px-6 pb-4 pt-6">
            <DialogTitle className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <Dumbbell className="size-5 text-foreground" aria-hidden="true" />
              {t("selector.select_exercise")}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {t("selector.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 pb-6 pt-4">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-12 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <Spinner className="size-5" />
                <span>{t("selector.loading")}</span>
              </div>
            )}

            {hasError && (
              <div className="flex items-center justify-center gap-2 py-12 font-mono text-[10px] uppercase tracking-[0.18em] text-destructive">
                <span>{t("selector.error")}</span>
              </div>
            )}

            {!isLoading && !hasError && (
              <>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    placeholder={t("selector.search_placeholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="rounded-none pl-10"
                    autoFocus
                  />
                </div>

                <ExerciseFilters
                  selectedMuscleGroup={selectedMuscleGroup}
                  selectedEquipment={selectedEquipment}
                  searchQuery={searchQuery}
                  muscleGroups={muscleGroups}
                  equipment={equipment}
                  onMuscleGroupChange={setSelectedMuscleGroup}
                  onEquipmentChange={setSelectedEquipment}
                  onClearFilters={clearFilters}
                />

                <Separator className="my-2" />

                <ScrollArea className="max-h-96">
                  {isLoadingExercises ? (
                    <div className="flex items-center justify-center gap-2 py-12 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      <Spinner className="size-5" />
                      <span>{t("selector.loading")}</span>
                    </div>
                  ) : exercises.length === 0 ? (
                    <Empty className="rounded-none border border-border p-12">
                      <EmptyHeader>
                        <SearchX
                          className="size-5 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <EmptyTitle className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground">
                          {t("filters.no_results")}
                        </EmptyTitle>
                        <EmptyDescription>
                          {t("filters.clear")}
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    <m.div
                      variants={exerciseStagger}
                      initial="hidden"
                      animate="visible"
                    >
                      <ItemGroup className="gap-2 border border-border">
                        {exercises.map((exercise) => {
                          const isSelected =
                            selectedId !== null &&
                            selectedId === String(exercise.exerciseId);
                          return (
                            <m.div
                              key={exercise.exerciseId}
                              variants={itemVariants}
                            >
                              <Item
                                variant="outline"
                                size="sm"
                                render={
                                  <button
                                    type="button"
                                    onClick={() => handleSelect(exercise)}
                                    aria-current={isSelected || undefined}
                                    className={cn(
                                      "gap-2 *:rounded-none border-x-0 border-b-2 border-border text-left transition-[background-color,transform] duration-150 ease-out hover:bg-muted/50 motion-safe:active:scale-[0.99]",
                                      isSelected && "bg-muted/40",
                                    )}
                                  />
                                }
                              >
                                <ItemMedia
                                  variant="icon"
                                  className="rounded-none bg-transparent"
                                >
                                  <Dumbbell
                                    className="size-5 text-muted-foreground transition-colors duration-150 ease-out group-hover/item:text-foreground"
                                    aria-hidden="true"
                                  />
                                </ItemMedia>
                                <ItemContent>
                                  <ItemTitle className="text-sm font-semibold text-foreground">
                                    {exercise.name}
                                  </ItemTitle>
                                  <ItemDescription className="line-clamp-2 text-xs text-muted-foreground">
                                    {exercise.instructions}
                                  </ItemDescription>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {exercise.muscleGroup && (
                                      <MuscleGroupBadge
                                        muscleGroup={exercise.muscleGroup}
                                        variant="small"
                                      />
                                    )}
                                    {exercise.equipment && (
                                      <EquipmentBadge
                                        equipment={exercise.equipment}
                                        variant="small"
                                      />
                                    )}
                                  </div>
                                </ItemContent>
                                <ItemActions>
                                  {isSelected ? (
                                    <Check
                                      className="size-5 text-foreground"
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-transform duration-200 ease-out group-hover/item:text-foreground motion-safe:group-hover/item:translate-x-0.5">
                                      →
                                    </span>
                                  )}
                                </ItemActions>
                              </Item>
                            </m.div>
                          );
                        })}
                      </ItemGroup>
                    </m.div>
                  )}
                </ScrollArea>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MotionProvider>
  );
}
