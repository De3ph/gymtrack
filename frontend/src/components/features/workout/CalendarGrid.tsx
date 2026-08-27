"use client";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";

interface CalendarGridProps {
  selectedDate: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  workoutDays: Date[];
}

export function CalendarGrid({
  selectedDate,
  onSelect,
  currentMonth,
  onMonthChange,
  workoutDays,
}: CalendarGridProps) {
  const t = useTranslations("workout.calendar");
  const tDate = useTranslations("common.date");
  return (
    <div className="flex flex-col border border-border">
      <header className="border-b border-border px-4 py-3 sm:px-6 sm:py-4">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {t("title")}
        </h3>
      </header>
      <div className="flex justify-center px-4 py-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onSelect}
          modifiers={{ workout: workoutDays }}
          modifiersClassNames={{ workout: "underline underline-offset-4" }}
          className="rounded-none border border-border [--cell-radius:0]"
          month={currentMonth}
          onMonthChange={onMonthChange}
        />
      </div>
      <Separator />
      <footer className="flex flex-wrap gap-2 px-4 py-3 sm:px-6">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 rounded-none font-mono text-[10px] uppercase tracking-[0.18em]"
          onClick={() => {
            const today = dayjs().toDate();
            onSelect(today);
            onMonthChange(new Date(today.getFullYear(), today.getMonth(), 1));
          }}
        >
          {tDate("today")}
        </Button>
      </footer>
    </div>
  );
}
