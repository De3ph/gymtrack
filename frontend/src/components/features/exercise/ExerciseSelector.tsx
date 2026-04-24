"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, ChevronDown } from "lucide-react";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { exerciseApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MuscleGroupBadge } from "./MuscleGroupBadge";
import { EquipmentBadge } from "./EquipmentBadge";
import { ExerciseLibrary, ExerciseSearchParams, MuscleGroup, Equipment } from "@/types";

interface ExerciseSelectorProps {
  onSelect: (exercise: ExerciseLibrary) => void;
  selectedExerciseId?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function ExerciseSelector({
  onSelect,
  selectedExerciseId,
  disabled = false,
}: ExerciseSelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<number | undefined>();
  const [selectedEquipment, setSelectedEquipment] = useState<number | undefined>();

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch muscle groups
  const { data: muscleGroupsData, isLoading: isLoadingMuscleGroups, error: muscleGroupsError } = useQuery({
    queryKey: ["muscleGroups"],
    queryFn: () => exerciseApi.getMuscleGroups(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Fetch equipment types
  const { data: equipmentData, isLoading: isLoadingEquipment, error: equipmentError } = useQuery({
    queryKey: ["equipmentTypes"],
    queryFn: () => exerciseApi.getEquipment(),
    staleTime: 1000 * 60 * 10, // 10 minutes
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
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleSelect = useCallback((exercise: ExerciseLibrary) => {
    onSelect(exercise);
    setIsDialogOpen(false);
    // Reset filters
    setSearchQuery("");
    setSelectedMuscleGroup(undefined);
    setSelectedEquipment(undefined);
  }, [onSelect]);

  const clearFilters = useCallback(() => {
    setSelectedMuscleGroup(undefined);
    setSelectedEquipment(undefined);
    setSearchQuery("");
  }, []);

  const muscleGroups = muscleGroupsData || [];
  const equipment = equipmentData || [];
  const rawExercises = exercisesData || [];

  // Handle errors
  const hasError = muscleGroupsError || equipmentError;
  const isLoading = isLoadingMuscleGroups || isLoadingEquipment;

  // Join muscle group and equipment data
  const exercises = rawExercises.map((exercise: ExerciseLibrary) => ({
    ...exercise,
    muscleGroup: muscleGroups.find(mg => mg.id === exercise.muscleGroupId),
    equipment: equipment.find(eq => eq.id === exercise.equipmentId),
  }));

  const selectedExercise = exercises.find((ex: ExerciseLibrary) => ex.exerciseId === selectedExerciseId);

  return (
    <div className="flex items-center gap-2">
      {/* Pick Exercise Button */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
          >
            Pick Exercise
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Exercise</DialogTitle>
            <DialogDescription>
              Search and filter exercises to add to your workout
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Loading exercise data...
              </div>
            )}

            {/* Error State */}
            {hasError && (
              <div className="text-center py-8 text-sm text-red-600">
                Error loading exercise data. Please try again.
              </div>
            )}

            {/* Normal State */}
            {!isLoading && !hasError && (
              <>
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search exercises..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                  {/* Muscle Group Filter */}
                  <select
                    value={selectedMuscleGroup || ""}
                    onChange={(e) => setSelectedMuscleGroup(e.target.value ? Number(e.target.value) : undefined)}
                    className="px-3 py-1 text-sm border rounded-md bg-background"
                  >
                    <option value="">All Muscle Groups</option>
                    {muscleGroups.map((mg: MuscleGroup) => (
                      <option key={mg.id} value={mg.id}>
                        {mg.description}
                      </option>
                    ))}
                  </select>

                  {/* Equipment Filter */}
                  <select
                    value={selectedEquipment || ""}
                    onChange={(e) => setSelectedEquipment(e.target.value ? Number(e.target.value) : undefined)}
                    className="px-3 py-1 text-sm border rounded-md bg-background"
                  >
                    <option value="">All Equipment</option>
                    {equipment.map((eq: Equipment) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.description}
                      </option>
                    ))}
                  </select>

                  {/* Clear Filters */}
                  {(selectedMuscleGroup || selectedEquipment || searchQuery) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-xs"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>

                {/* Exercise List */}
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {isLoadingExercises ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      Loading exercises...
                    </div>
                  ) : exercises.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No exercises found
                    </div>
                  ) : (
                    exercises.map((exercise: ExerciseLibrary) => (
                      <Card
                        key={exercise.exerciseId}
                        className="cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => handleSelect(exercise)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium">{exercise.name}</div>
                              <div className="text-sm text-muted-foreground capitalize">{exercise.category}</div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {exercise.muscleGroup && (
                                  <MuscleGroupBadge muscleGroup={exercise.muscleGroup} variant="small" />
                                )}
                                {exercise.equipment && (
                                  <EquipmentBadge equipment={exercise.equipment} variant="small" />
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
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
