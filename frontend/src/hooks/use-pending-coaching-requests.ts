"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

// Direct module import, not the `@/lib/api` barrel: this hook is mounted by the
// dashboard layout (AppSidebar), so the barrel would pull every domain API into
// every dashboard route's layout chunk.
import { coachingRequestApi } from "@/lib/api/coachingRequestApi";
import { qk } from "@/lib/query-keys";

/**
 * How often the trainer's pending-request badge re-checks the server.
 *
 * This is the only signal a trainer gets that an athlete asked to work with
 * them — there are no push notifications — so it deliberately polls instead of
 * waiting for the 5 minute global `staleTime`. React Query pauses the interval
 * while the tab is hidden, so a background tab costs no requests.
 */
export const PENDING_REQUESTS_POLL_INTERVAL_MS = 60_000;

/**
 * Pending-request count for this trainer's badge.
 *
 * `enabled` keeps athletes/admins from hitting the trainer-only `/pending`
 * endpoint (the backend answers 403 for them).
 *
 * `isError` is surfaced separately so a failed check is not mistaken for "no
 * pending requests". React Query keeps the last successful count across failed
 * refetches, so an established count still wins over the error flag.
 */
export function usePendingCoachingRequestsCount(enabled: boolean): {
  count: number;
  isError: boolean;
} {
  const { data, isError } = useQuery({
    queryKey: qk.coaching.pending,
    queryFn: () => coachingRequestApi.getPendingRequests(),
    enabled,
    refetchInterval: PENDING_REQUESTS_POLL_INTERVAL_MS,
  });

  const count = data?.requests?.length ?? 0;
  // Stable identity so a memoized consumer (or a future one) does not re-render
  // on every parent render.
  return useMemo(() => ({ count, isError }), [count, isError]);
}
