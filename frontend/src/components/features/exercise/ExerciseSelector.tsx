"use client";

import { useState, useCallback, useMemo, useDeferredValue } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Search, Dumbbell, SearchX } from "lucide-react";
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
import { exerciseReveal } from "./exercise-variants";
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
    queryKey: ["muscleGroups"],
    queryFn: () => exerciseApi.getMuscleGroups(),
    staleTime: STALE_TIMES.TWELVE_HOURS,
  });

  const {
    data: equipmentData,
    isLoading: isLoadingEquipment,
    error: equipmentError,
  } = useQuery({
    queryKey: ["equipmentTypes"],
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
    queryKey: ["exercises", searchParams],
    queryFn: () => exerciseApi.search(searchParams),
    enabled: isDialogOpen,
    staleTime: STALE_TIMES.FIVE_MINUTES,
  });

  const handleSelect = useCallback(
    (exercise: ExerciseLibrary) => {
      onSelect(exercise);
      setIsDialogOpen(false);
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

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={disabled}
            className="rounded-none font-mono text-[10px] uppercase tracking-[0.18em] shadow-none"
          >
            <Dumbbell className="size-3.5" aria-hidden="true" />
            {t("selector.pick_exercise")}
          </Button>
        }
      />
      <DialogContent className="min-w-[50dvw] max-h-[80vh] overflow-y-auto rounded-none border border-border p-0 text-foreground shadow-none ring-0">
        <DialogHeader className="border-b border-border px-6 pb-4 pt-6">
          <DialogTitle className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <Dumbbell className="size-4 text-foreground" aria-hidden="true" />
            {t("selector.select_exercise")}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t("selector.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6 pt-4">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-12 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <Spinner className="size-4" />
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
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
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
                    <Spinner className="size-4" />
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
                  <ItemGroup className="gap-2 border border-border">
                    {exercises.map((exercise) => (
                      <motion.div key={exercise.exerciseId} {...exerciseReveal}>
                        <Item
                          variant="outline"
                          size="sm"
                          render={
                            <button
                              type="button"
                              onClick={() => handleSelect(exercise)}
                              className={cn(
                                "gap-2 *:rounded-none border-x-0 border-b-2 border-border text-left last:border-b-0",
                              )}
                            />
                          }
                        >
                          <ItemMedia
                            variant="icon"
                            className="rounded-none bg-transparent"
                          >
                            <Dumbbell
                              className="size-4 text-muted-foreground"
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
                            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                              →
                            </span>
                          </ItemActions>
                        </Item>
                      </motion.div>
                    ))}
                  </ItemGroup>
                )}
              </ScrollArea>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
