"use client";

import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader><CardTitle>{t("title")}</CardTitle></CardHeader>
      <CardContent className="flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onSelect}
          modifiers={{ meal: mealDays.map((d) => dayjs(d).toDate()) }}
          modifiersClassNames={{ meal: "font-bold text-primary underline" }}
          className="rounded-md border"
        />
      </CardContent>
    </Card>
  );
}
