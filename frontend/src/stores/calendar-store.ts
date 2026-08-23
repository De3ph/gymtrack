import dayjs from "@/lib/i18n/dayjs";
import { create } from "zustand";

/**
 * The "active date" shared by the standalone Meal/Workout calendars so the
 * selected day survives navigation between routes/tabs. `viewMonth` keeps the
 * month the user last scrolled to (used by the workout calendar grid).
 */
export interface CalendarUiState {
  activeDate: Date;
  viewMonth: Date;
  setActiveDate: (date: Date) => void;
  setViewMonth: (date: Date) => void;
}

export const useCalendarStore = create<CalendarUiState>((set) => ({
  activeDate: dayjs().toDate(),
  viewMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  setActiveDate: (activeDate) => set({ activeDate }),
  setViewMonth: (viewMonth) => set({ viewMonth }),
}));