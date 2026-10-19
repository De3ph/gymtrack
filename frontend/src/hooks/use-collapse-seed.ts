"use client";

import * as React from "react";

export interface CollapseSeedItem {
  /** Stable identity of the row. */
  id: string | number | undefined | null;
  /** ISO date used to decide which row is the most recent one. */
  date?: string;
}

/**
 * Picks the id of the most recent row.
 *
 * Rows without a usable date never win, so a list that arrives without dates
 * still keeps its first row open.
 */
function findNewestId(items: CollapseSeedItem[]): string | undefined {
  let newestId: string | undefined;
  let firstId: string | undefined;
  let newestTime = -Infinity;

  for (const item of items) {
    if (item.id === undefined || item.id === null) continue;

    const id = String(item.id);
    if (firstId === undefined) firstId = id;

    const parsed = item.date ? Date.parse(item.date) : NaN;
    const time = Number.isNaN(parsed) ? -Infinity : parsed;

    // Strictly greater: on equal dates the earlier row stays open.
    if (time > newestTime) {
      newestTime = time;
      newestId = id;
    }
  }

  return newestId ?? firstId;
}

/**
 * Collapse state for a card list where every card starts collapsed except the
 * most recent one.
 *
 * The seed is derived from the currently rendered rows instead of an effect, so
 * a page turn or filter change re-seeds during render and never paints an
 * expanded page first. Users can still expand any number of cards afterwards;
 * the seed only reapplies when the rendered set actually changes.
 */
export function useCollapseSeed(
  items: CollapseSeedItem[],
  enabled: boolean,
) {
  const [collapsedIds, setCollapsedIds] = React.useState<Record<string, boolean>>(
    {},
  );
  const [seedKey, setSeedKey] = React.useState("");

  const renderedIdsKey = items
    .filter(
      (item): item is CollapseSeedItem & { id: string | number } =>
        item.id !== undefined && item.id !== null,
    )
    .map((item) => String(item.id))
    .join(",");

  if (enabled && renderedIdsKey && renderedIdsKey !== seedKey) {
    const newestId = findNewestId(items);
    const next: Record<string, boolean> = {};
    renderedIdsKey.split(",").forEach((id) => {
      if (id !== newestId) {
        next[id] = true;
      }
    });
    setSeedKey(renderedIdsKey);
    setCollapsedIds(next);
  }

  const toggleCollapsed = React.useCallback((id: string | number) => {
    const key = String(id);
    setCollapsedIds((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return { collapsedIds, toggleCollapsed };
}
