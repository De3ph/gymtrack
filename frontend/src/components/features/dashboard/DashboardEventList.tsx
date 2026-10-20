"use client";

import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
  const reduce = useReducedMotion();

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
    // Switching days swaps the whole list, so the panel crossfades instead of
    // teleporting. Opacity only: this surface is read dozens of times a day.
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={date.toISOString()}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reduce ? undefined : { opacity: 0 }}
        transition={{ duration: 0.1, ease: "easeOut" }}
      >
        <div className="space-y-4">
          <div>
            <p className="text-center font-mono text-[10px] uppercase leading-3 tracking-[0.18em] text-muted-foreground">
              {formatDate(date, "dddd, MMMM D, YYYY")}
            </p>
          </div>

          <ul className="border border-border divide-y divide-border">
            {events.map((event) => (
              <DashboardEventItem key={`${event.kind}-${event.id}`} event={event} />
            ))}
          </ul>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
