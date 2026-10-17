"use client";

import * as React from "react";

/**
 * Collapse state for a card list where every card starts collapsed except the
 * newest one.
 *
 * The seed is derived from the currently rendered ids instead of an effect, so
 * a page turn or filter change re-seeds during render and never paints an
 * expanded page first. Users can still expand any number of cards afterwards;
 * the seed only reapplies when the rendered set actually changes.
 */
export function useCollapseSeed(
  ids: Array<string | number | undefined>,
  enabled: boolean,
) {
  const [collapsedIds, setCollapsedIds] = React.useState<Record<string, boolean>>(
    {},
  );
  const [seedKey, setSeedKey] = React.useState("");

  const renderedIdsKey = ids
    .filter((id): id is string | number => id !== undefined && id !== null)
    .map(String)
    .join(",");

  if (enabled && renderedIdsKey && renderedIdsKey !== seedKey) {
    const next: Record<string, boolean> = {};
    renderedIdsKey
      .split(",")
      .slice(1)
      .forEach((id) => {
        next[id] = true;
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
