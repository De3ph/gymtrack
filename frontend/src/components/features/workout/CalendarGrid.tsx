"use client";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";

interface CalendarGridProps {
  selectedDate: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  workoutDays: Date[];
}

export function CalendarGrid({ selectedDate, onSelect, currentMonth, onMonthChange, workoutDays }: CalendarGridProps) {
  const t = useTranslations("workout.calendar");
  const tDate = useTranslations("common.date");
  return (
    <Card>
      <CardHeader><CardTitle>{t("title")}</CardTitle></CardHeader>
      <CardContent className="flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onSelect}
          modifiers={{ workout: workoutDays }}
          modifiersClassNames={{ workout: "font-bold text-primary underline" }}
          className="rounded-md border"
          month={currentMonth}
          onMonthChange={onMonthChange}
        />
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 border-t">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => {
          const today = dayjs().toDate();
          onSelect(today);
          onMonthChange(new Date(today.getFullYear(), today.getMonth(), 1));
        }}>
          {tDate("today")}
        </Button>
      </CardFooter>
    </Card>
  );
}
