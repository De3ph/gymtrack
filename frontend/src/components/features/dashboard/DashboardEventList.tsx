"use client";

import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { useTranslations } from "next-intl";
import { formatDate } from "@/lib/i18n/dayjs";
import { DashboardEventItem } from "./DashboardEventItem";

export type DashboardEventKind = "workout" | "meal";

export interface DashboardEvent {
  id: string | number;
  kind: DashboardEventKind;
  title: string;
  time: string;
  detail?: string;
}

interface DashboardEventListProps {
  date: Date;
  events: DashboardEvent[];
}

export function DashboardEventList({ date, events }: DashboardEventListProps) {
  const t = useTranslations("dashboard.events");

  if (events.length === 0) {
    return (
      <Empty className="rounded-none border border-border bg-card">
        <EmptyHeader>
          <EmptyTitle className="font-sans text-base font-semibold text-foreground">
            {t("empty_title")}
          </EmptyTitle>
          <EmptyDescription className="font-sans text-sm leading-6 text-muted-foreground">
            {t("empty_description")}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-center font-mono text-[10px] uppercase leading-3 tracking-[0.18em] text-muted-foreground">
        {formatDate(date, "dddd, MMMM D, YYYY")}
      </p>
      <ul className="border border-border divide-y divide-border">
        {events.map((event) => (
          <DashboardEventItem key={`${event.kind}-${event.id}`} event={event} />
        ))}
      </ul>
    </div>
  );
}
