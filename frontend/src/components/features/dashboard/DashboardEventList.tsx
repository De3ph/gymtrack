"use client";

import { CalendarDays, UtensilsCrossed } from "lucide-react";
import { useTranslations } from "next-intl";
import dayjs from "dayjs";

export type DashboardEventKind = "workout" | "meal";

export interface DashboardEvent {
  id: string;
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
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center">
        <p className="font-heading text-lg font-medium text-foreground">
          {t("empty_title")}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("empty_description")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {dayjs(date).format("dddd, MMMM D, YYYY")}
      </p>
      {events.map((event) => (
        <div
          key={`${event.kind}-${event.id}`}
          className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4"
        >
          <div
            className={cnEventIcon(event.kind)}
          >
            {event.kind === "workout" ? (
              <CalendarDays className="h-4 w-4" />
            ) : (
              <UtensilsCrossed className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="font-semibold text-foreground">{event.title}</p>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {event.time}
              </span>
            </div>
            {event.detail && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {event.detail}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function cnEventIcon(kind: DashboardEventKind) {
  return kind === "workout"
    ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"
    : "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
}
