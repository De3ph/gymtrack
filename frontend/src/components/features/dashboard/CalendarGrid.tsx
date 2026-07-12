"use client";

import { Calendar } from "@/components/ui/calendar";

interface CalendarGridProps {
  selectedDate: Date;
  onSelect: (date: Date | undefined) => void;
  viewMonth: Date;
  onMonthChange: (date: Date) => void;
  workoutDates: Date[];
  mealDates: Date[];
}

export function CalendarGrid({
  selectedDate, onSelect, viewMonth, onMonthChange,
  workoutDates, mealDates,
}: CalendarGridProps) {
  return (
    <div className="flex justify-center rounded-2xl bg-muted/30 p-4">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={(date) => date && onSelect(date)}
        month={viewMonth}
        onMonthChange={onMonthChange}
        modifiers={{
          workout: workoutDates,
          meal: mealDates,
        }}
        modifiersClassNames={{
          workout: "font-semibold text-primary after:absolute after:-bottom-0.5 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-primary",
          meal: "font-semibold text-emerald-600 after:absolute after:-bottom-0.5 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-emerald-500 dark:text-emerald-400 dark:after:bg-emerald-400",
        }}
        className="rounded-xl border bg-background"
      />
    </div>
  );
}
