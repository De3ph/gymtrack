"use client";

import * as React from "react";

/**
 * Identity of the current result window. A new one means page 1.
 *
 * The tab components keep this in one place so the reset key, the query key
 * and the API params cannot drift apart.
 */
export function clientHistoryKey(
  username: string,
  dateRange: { start: string; end: string },
  typeFilter = "",
) {
  return `${username}|${dateRange.start}|${dateRange.end}|${typeFilter}`;
}

/**
 * Trainer client-detail history lists derive their page offset from the shared
 * filter state. Changing client or filters must snap back to page 1, and doing
 * that inside an effect triggers a second render pass (and a lint error), so
 * the reset runs during render, guarded by the last key that was seen.
 */
export function usePageResetOnChange(key: string) {
  const [page, setPage] = React.useState(1);
  const [seenKey, setSeenKey] = React.useState(key);

  if (seenKey !== key) {
    setSeenKey(key);
    setPage(1);
  }

  return [page, setPage] as const;
}
