"use client";

import { useState, useCallback, useMemo, useDeferredValue } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Search, Dumbbell, SearchX, Loader2 } from "lucide-react";
import { motion } from "motion/react";
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
import { MuscleGroupBadge } from "./MuscleGroupBadge";
import { EquipmentBadge } from "./EquipmentBadge";
import { ExerciseFilters } from "./exercise-selector/ExerciseFilters";
import { ExerciseLibrary, ExerciseSearchParams } from "@/types";
import { STALE_TIMES } from "@/lib/api/api-constants";

interface ExerciseSelectorProps {
  onSelect: (exercise: ExerciseLibrary) => void;
  selectedExerciseId?: string | number;
  disabled?: boolean;
  placeholder?: string;
}

export function ExerciseSelector({
  onSelect,
  disabled = false,
}: ExerciseSelectorProps) {
  const t = useTranslations("exercise");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // Catalog filter persists across dialog reopenings via the shared store.
  const {
    searchQuery,
    selectedMuscleGroup,
    selectedEquipment,
    setSearchQuery,
    setSelectedMuscleGroup,
    setSelectedEquipment,
  } = useExerciseCatalogStore();

  // Defer the search query so the input stays responsive while expensive
  // search/filter operations derive from it (rerender-use-deferred-value).
  const deferredSearch = useDeferredValue(searchQuery);
  const debouncedSearch = useDebounce(deferredSearch, 300);

  // Fetch muscle groups
  const {
    data: muscleGroupsData,
    isLoading: isLoadingMuscleGroups,
    error: muscleGroupsError,
  } = useQuery({
    queryKey: ["muscleGroups"],
    queryFn: () => exerciseApi.getMuscleGroups(),
    staleTime: STALE_TIMES.TWELVE_HOURS,
  });

  // Fetch equipment types
  const {
    data: equipmentData,
    isLoading: isLoadingEquipment,
    error: equipmentError,
  } = useQuery({
    queryKey: ["equipmentTypes"],
    queryFn: () => exerciseApi.getEquipment(),
    staleTime: STALE_TIMES.TWELVE_HOURS,
  });

  // Build search params
  const searchParams: ExerciseSearchParams = useMemo(() => {
    const params: ExerciseSearchParams = {};
    if (debouncedSearch) params.query = debouncedSearch;
    if (selectedMuscleGroup) params.muscleGroupId = selectedMuscleGroup;
    if (selectedEquipment) params.equipmentId = selectedEquipment;
    params.limit = 20;
    return params;
  }, [debouncedSearch, selectedMuscleGroup, selectedEquipment]);

  // Fetch exercises - only when dialog is open
  const { data: exercisesData, isLoading: isLoadingExercises } = useQuery({
    queryKey: ["exercises", searchParams],
    queryFn: () => exerciseApi.search(searchParams),
    enabled: isDialogOpen,
    staleTime: STALE_TIMES.FIVE_MINUTES,
  });

  const handleSelect = useCallback(
    (exercise: ExerciseLibrary) => {
      onSelect(exercise);
      setIsDialogOpen(false);
      // NOTE: catalog filters intentionally persist in `useExerciseCatalogStore`
      // so the athlete's last search/filters are restored on the next open.
    },
    [onSelect],
  );

  const clearFilters = useCallback(() => {
    setSelectedMuscleGroup(undefined);
    setSelectedEquipment(undefined);
    setSearchQuery("");
  }, []);

  const muscleGroups = muscleGroupsData || [];
  const equipment = equipmentData || [];

  // Handle errors
  const hasError = muscleGroupsError || equipmentError;
  const isLoading = isLoadingMuscleGroups || isLoadingEquipment;

  // Join muscle group and equipment data — memoized so the mapping only
  // re-runs when one of its inputs actually changes (rerender-memo). The
  // `?? []` fallbacks live inside the callback so the dependency list uses
  // the stable query result references.
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

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={disabled}
            className="gap-2 shadow-sm"
          >
            <Dumbbell className="h-4 w-4" />
            {t("selector.pick_exercise")}
          </Button>
        }
      />
      <DialogContent className="min-w-[50dvw] max-h-[80vh] overflow-y-auto p-2">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Dumbbell className="h-5 w-5 text-primary" />
            {t("selector.select_exercise")}
          </DialogTitle>
          <DialogDescription>{t("selector.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6 pt-4">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("selector.loading")}
            </div>
          )}

          {/* Error State */}
          {hasError && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-destructive">
              {t("selector.error")}
            </div>
          )}

          {/* Normal State */}
          {!isLoading && !hasError && (
            <>
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("selector.search_placeholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-muted/30 border-muted"
                  autoFocus
                />
              </div>

              {/* Filters */}
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

              {/* Exercise List */}
              <ScrollArea className="max-h-96 [&>[data-slot=scroll-area-viewport]>:space-y-2">
                {isLoadingExercises ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("selector.loading")}
                  </div>
                ) : exercises.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
                    <SearchX className="h-8 w-8 opacity-40" />
                    <p className="text-sm">{t("filters.no_results")}</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {exercises.map(
                      (exercise: ExerciseLibrary, index: number) => (
                        <motion.div
                          key={exercise.exerciseId}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.2,
                            delay: index * 0.03,
                            ease: "easeOut",
                          }}
                        >
                          <button
                            type="button"
                            className="w-full text-left rounded-lg border-l-4 border-l-primary/20 bg-card hover:border-l-primary hover:bg-accent/10 hover:shadow-md transition-all duration-200 group cursor-pointer"
                            style={{ contentVisibility: "auto" }}
                            onClick={() => handleSelect(exercise)}
                          >
                            <div className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-foreground group-hover:text-primary transition-colors duration-150">
                                    {exercise.name}
                                  </div>
                                  <div className="flex flex-wrap gap-1.5 mt-2.5">
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
                                  {exercise.instructions && (
                                    <div className="text-xs text-muted-foreground mt-2.5 pl-3 border-l-2 border-border line-clamp-2">
                                      {exercise.instructions}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        </motion.div>
                      ),
                    )}
                  </div>
                )}
              </ScrollArea>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
