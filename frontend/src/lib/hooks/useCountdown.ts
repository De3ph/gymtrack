"use client";

import { useEffect, useRef, useState } from "react";

interface UseCountdownOptions {
  /** When true, the countdown starts/resets. When false, it stops. */
  active: boolean;
  /** Starting value (counts down to 0). */
  start: number;
}

/**
 * Countdown timer that resets to `start` whenever `active` transitions
 * from false → true. Stops automatically at 0.
 *
 * Uses setTimeout (not setInterval) for clean React 18+ strict-mode
 * lifecycle handling.
 */
export function useCountdown({ active, start }: UseCountdownOptions): number {
  const [count, setCount] = useState(start);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track previous active value so we only reset on the false→true edge
  const prevActive = useRef(false);

  useEffect(() => {
    // Reset countdown when active transitions false → true
    if (active && !prevActive.current) {
      setCount(start);
    }
    prevActive.current = active;
  }, [active, start]);

  useEffect(() => {
    if (!active || count <= 0) return;

    timerRef.current = setTimeout(() => {
      setCount((prev) => prev - 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [active, count]);

  return count;
}
