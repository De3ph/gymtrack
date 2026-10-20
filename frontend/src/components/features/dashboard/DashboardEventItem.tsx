import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { CalendarDays, UtensilsCrossed } from "lucide-react";
import type { DashboardEvent } from "./DashboardEventList";

interface DashboardEventItemProps {
  event: DashboardEvent;
}

export function DashboardEventItem({ event }: DashboardEventItemProps) {
  return (
    <Item
      variant="outline"
      size="default"
      className="rounded-none border-0 border-b border-border last:border-b-0"
    >
      <ItemMedia variant="icon" className="rounded-none border border-border bg-background">
        {event.kind === "workout" ? (
          <CalendarDays className="size-5 text-muted-foreground" aria-hidden="true" />
        ) : (
          <UtensilsCrossed className="size-5 text-muted-foreground" aria-hidden="true" />
        )}
      </ItemMedia>
      <ItemContent>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <ItemTitle className="font-sans text-sm font-semibold text-foreground">
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
  );
}
