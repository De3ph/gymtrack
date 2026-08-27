"use client";

import { Calendar } from "@/components/ui/calendar";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";

interface CalendarGridProps {
  selectedDate: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  mealDays: Date[];
}

export function CalendarGrid({ selectedDate, onSelect, mealDays }: CalendarGridProps) {
  const t = useTranslations("meal.calendar");
  return (
    <div className="border border-border">
      <header className="border-b border-border px-6 py-4">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {t("title")}
        </h3>
      </header>
      <div className="flex justify-center p-6">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onSelect}
          modifiers={{ meal: mealDays.map((d) => dayjs(d).toDate()) }}
          modifiersClassNames={{ meal: "font-medium text-primary underline" }}
          className="rounded-none border border-border"
        />
      </div>
    </div>
  );
}
