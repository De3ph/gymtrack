import type { WorkoutFilter } from "@/components/features/workout/WorkoutList";
import { createListUiStore } from "./list-ui-store";

const EMPTY_FILTER: WorkoutFilter = {};

/**
 * Workout list filter + pagination persists across `/workouts` ↔ dashboard
 * tab switches.
 */
export const useWorkoutListStore = createListUiStore<WorkoutFilter>(EMPTY_FILTER);