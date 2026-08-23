import { create } from "zustand";

/**
 * Session-persistent exercise-catalog filter state. `ExerciseSelector` is
 * reused across several forms; this store keeps the last muscle-group /
 * equipment / search filter across reopenings instead of resetting per open.
 */
export interface ExerciseCatalogUiState {
  searchQuery: string;
  selectedMuscleGroup: number | undefined;
  selectedEquipment: number | undefined;
  setSearchQuery: (value: string) => void;
  setSelectedMuscleGroup: (value: number | undefined) => void;
  setSelectedEquipment: (value: number | undefined) => void;
  reset: () => void;
}

export const useExerciseCatalogStore = create<ExerciseCatalogUiState>(
  (set) => ({
    searchQuery: "",
    selectedMuscleGroup: undefined,
    selectedEquipment: undefined,
    setSearchQuery: (searchQuery) => set({ searchQuery }),
    setSelectedMuscleGroup: (selectedMuscleGroup) => set({ selectedMuscleGroup }),
    setSelectedEquipment: (selectedEquipment) => set({ selectedEquipment }),
    reset: () =>
      set({
        searchQuery: "",
        selectedMuscleGroup: undefined,
        selectedEquipment: undefined,
      }),
  }),
);