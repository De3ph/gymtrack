import type { MealFilter } from "@/components/features/meal/MealList";
import { createListUiStore } from "./list-ui-store";

const EMPTY_FILTER: MealFilter = {};

/**
 * Meal list filter + pagination persists across `/meals` route and dashboard
 * tab switches.
 */
export const useMealListStore = createListUiStore<MealFilter>(EMPTY_FILTER);