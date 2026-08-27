"use client";

import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { CalendarDays, UtensilsCrossed } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatDate } from "@/lib/i18n/dayjs";

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
          <EmptyTitle className="font-sans text-base font-medium text-foreground">
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
          <Item
            key={`${event.kind}-${event.id}`}
            variant="outline"
            size="default"
            className="rounded-none border-0 border-b border-border last:border-b-0"
          >
            <ItemMedia variant="icon" className="rounded-none border border-border bg-background">
              {event.kind === "workout" ? (
                <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
              ) : (
                <UtensilsCrossed className="size-4 text-muted-foreground" aria-hidden="true" />
              )}
            </ItemMedia>
            <ItemContent>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <ItemTitle className="font-sans text-sm font-medium text-foreground">
                  {event.title}
                </ItemTitle>
                <span className="inline-flex items-center border border-border bg-background px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {event.time}
                </span>
              </div>
              {event.detail && (
                <ItemDescription className="font-sans text-sm leading-6 text-muted-foreground">
                  {event.detail}
                </ItemDescription>
              )}
            </ItemContent>
          </Item>
        ))}
      </ul>
    </div>
  );
}
