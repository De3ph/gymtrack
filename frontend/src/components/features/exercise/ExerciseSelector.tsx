"use client";

import { useState, useCallback, useMemo, useDeferredValue } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { exerciseApi } from "@/lib/api";
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
import { Card, CardContent } from "@/components/ui/card";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<
    number | undefined
  >();
  const [selectedEquipment, setSelectedEquipment] = useState<
    number | undefined
  >();

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
      // Reset filters
      setSearchQuery("");
      setSelectedMuscleGroup(undefined);
      setSelectedEquipment(undefined);
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
          (mg) => mg.id === exercise.muscleGroupId
        ),
        equipment: (equipmentData ?? []).find(
          (eq) => eq.id === exercise.equipmentId
        ),
      })),
    [exercisesData, muscleGroupsData, equipmentData],
  );

  return (
    <div className="flex items-center gap-2">
      {/* Pick Exercise Button */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
            >
              {t("selector.pick_exercise")}
            </Button>
          }
        />
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("selector.select_exercise")}</DialogTitle>
            <DialogDescription>{t("selector.description")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {t("selector.loading")}
              </div>
            )}

            {/* Error State */}
            {hasError && (
              <div className="text-center py-8 text-sm text-red-600">
                {t("selector.error")}
              </div>
            )}

            {/* Normal State */}
            {!isLoading && !hasError && (
              <>
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("selector.search_placeholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
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
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      {t("selector.loading")}
                    </div>
                  ) : exercises.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      {t("filters.no_results")}
                    </div>
                  ) : (
                    exercises.map((exercise: ExerciseLibrary) => (
                      <Card
                        key={exercise.exerciseId}
                        className="cursor-pointer hover:bg-accent transition-colors rounded-none border-0"
                        style={{ contentVisibility: "auto" }}
                        onClick={() => handleSelect(exercise)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium">{exercise.name}</div>
                              <div className="text-sm text-muted-foreground capitalize">
                                {exercise.category}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-2">
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
                                <div className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                  {exercise.instructions}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </ScrollArea>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
