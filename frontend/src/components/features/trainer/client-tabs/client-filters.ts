/**
 * Shared filter state for the trainer's client-detail history tabs.
 *
 * Every history tab reads the same date range, while the type filter is
 * tab-specific (workouts by exercise, meals by meal type). Keeping the shape
 * here means the filter bar, the tab list and the URL handling cannot drift
 * apart on which fields exist or what "empty" means.
 */
export interface ClientFilters {
  /** Inclusive `YYYY-MM-DD` lower bound. */
  start: string;
  /** Inclusive `YYYY-MM-DD` upper bound. */
  end: string;
  exerciseType: string;
  mealType: string;
}

export const EMPTY_CLIENT_FILTERS: ClientFilters = {
  start: "",
  end: "",
  exerciseType: "",
  mealType: "",
};

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

export const CLIENT_TABS = [
  "workouts",
  "meals",
  "measurements",
  "progress",
  "plans",
] as const;

export type ClientTab = (typeof CLIENT_TABS)[number];

export const DEFAULT_CLIENT_TAB: ClientTab = "workouts";

/** Tabs whose data is shaped by the shared filter bar. */
export type HistoryTab = Extract<ClientTab, "workouts" | "meals" | "measurements">;

export function isClientTab(value: string | null | undefined): value is ClientTab {
  return CLIENT_TABS.includes(value as ClientTab);
}

export function isHistoryTab(tab: ClientTab): tab is HistoryTab {
  return tab === "workouts" || tab === "meals" || tab === "measurements";
}

/**
 * Number of filters that currently shape the active tab's query.
 *
 * The count only includes what the tab actually consumes, so a lingering
 * exercise filter is not reported while the trainer is looking at meals.
 * A set date range counts once, not twice, because both bounds are one control.
 */
export function activeFilterCount(filters: ClientFilters, tab: ClientTab): number {
  let count = filters.start || filters.end ? 1 : 0;
  if (tab === "workouts" && filters.exerciseType) count += 1;
  if (tab === "meals" && filters.mealType) count += 1;
  return count;
}

export function hasActiveFilters(filters: ClientFilters, tab: ClientTab): boolean {
  return activeFilterCount(filters, tab) > 0;
}
