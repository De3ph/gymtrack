"use client";

import * as React from "react";
import dayjs from "@/lib/i18n/dayjs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";

/**
 * Shared day-marker treatments, so a given calendar type looks the same
 * wherever it appears.
 *
 * - `*Underline` — single-series calendars (workout days on their own page,
 *   meal days on their own). Only one kind of activity is on the grid, so an
 *   underline alone is enough to carry the meaning.
 * - `*Dot` — multi-series calendars (the dashboard, which puts workouts and
 *   meals on the same grid). Two series share the surface, so each gets a dot
 *   under the date plus a colour fixed to that series.
 */
export const markerStyles = {
  workoutUnderline: "underline underline-offset-4",
  mealUnderline: "font-semibold text-primary underline",
  workoutDot:
    "font-semibold text-primary after:absolute after:-bottom-0.5 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-primary",
  mealDot:
    "font-semibold text-teal-600 after:absolute after:-bottom-0.5 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-teal-500 dark:text-teal-400 dark:after:bg-teal-400",
} as const;

/**
 * A set of days to decorate on the calendar (workout days, meal days, ...).
 * `name` is the react-day-picker modifier key; `className` carries the visual
 * treatment so domain styling stays at the call site.
 */
export interface CalendarDayMarker {
  name: string;
  dates: Date[];
  className: string;
}

export interface CalendarGridProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  /** Controlled month. Omit to let the calendar manage its own month. */
  month?: Date;
  onMonthChange?: (date: Date) => void;
  markers?: CalendarDayMarker[];
  /**
   * Panel heading. When omitted the grid renders bare (no border, no header) —
   * for callers that already provide their own panel chrome.
   */
  title?: string;
  /** Appends a "Today" shortcut that selects today and scrolls to its month. */
  showTodayAction?: boolean;
  /** Label for the Today button. Required when `showTodayAction` is set. */
  todayLabel?: string;
  /** Classes merged onto the panel wrapper (panel mode only). */
  className?: string;
  /** Classes merged onto the underlying `<Calendar>`. */
  calendarClassName?: string;
}

/**
 * Single-select calendar with per-day markers.
 *
 * Presentation is deliberately flat and hairline-based per the DESIGN.md
 * register: `rounded-none`, 1px `border-border`, no shadows.
 */
export function CalendarGrid({
  selected,
  onSelect,
  month,
  onMonthChange,
  markers,
  title,
  showTodayAction,
  todayLabel,
  className,
  calendarClassName,
}: CalendarGridProps) {
  const modifiers = React.useMemo(() => {
    const entries = (markers ?? []).map(
      ({ name, dates }) =>
        [name, dates.map((date) => dayjs(date).toDate())] as [string, Date[]],
    );
    return Object.fromEntries(entries) as Record<string, Date[]>;
  }, [markers]);

  const modifiersClassNames = React.useMemo(
    () =>
      Object.fromEntries((markers ?? []).map(({ name, className }) => [name, className])) as Record<
        string,
        string
      >,
    [markers],
  );

  const handleToday = React.useCallback(() => {
    const today = dayjs().toDate();
    onSelect?.(today);
    onMonthChange?.(new Date(today.getFullYear(), today.getMonth(), 1));
  }, [onSelect, onMonthChange]);

  const showFooter = Boolean(showTodayAction && todayLabel);

  const calendar = (
    <Calendar
      mode="single"
      selected={selected}
      onSelect={onSelect}
      month={month}
      onMonthChange={onMonthChange}
      modifiers={modifiers}
      modifiersClassNames={modifiersClassNames}
      className={cn("rounded-none", calendarClassName)}
    />
  );

  if (!title) {
    return (
      <div
        className={cn(
          "flex justify-center border border-border bg-background p-4",
          className,
        )}
      >
        {calendar}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col border border-border", className)}>
      <header className="border-b border-border px-6 py-4">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </h3>
      </header>
      <div className="flex justify-center px-4 py-4 sm:px-6">{calendar}</div>
      {showFooter ? (
        <>
          <Separator />
          <footer className="flex flex-wrap gap-2 px-4 py-3 sm:px-6">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-none font-mono text-[10px] uppercase tracking-[0.18em]"
              onClick={handleToday}
            >
              {todayLabel}
            </Button>
          </footer>
        </>
      ) : null}
    </div>
  );
}