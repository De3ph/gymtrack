import { create } from "zustand";

/**
 * Generic UI state backing list filter + pagination so both survive
 * route/tab navigation (the driver for converting from use-local useState).
 *
 * Components keep their existing controlled-props API (`filter`/`onFilterChange`/
 * `page`/`onPageChange`) intact — this store backs only the uncontrolled fallback.
 */
export interface ListUiState<TFilter> {
  filter: TFilter;
  page: number;
  setFilter: (filter: TFilter) => void;
  setPage: (page: number) => void;
  reset: () => void;
}

export function createListUiStore<TFilter>(initialFilter: TFilter) {
  return create<ListUiState<TFilter>>((set) => ({
    filter: initialFilter,
    page: 1,
    // Changing the filter always resets to page 1 so the user isn't stranded on
    // a now-out-of-range page.
    setFilter: (filter) => set({ filter, page: 1 }),
    setPage: (page) => set({ page }),
    reset: () => set({ filter: initialFilter, page: 1 }),
  }));
}