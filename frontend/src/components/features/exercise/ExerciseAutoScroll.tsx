"use client";

import { useEffect, useRef } from "react";

/**
 * Scrolls a freshly added exercise row into view and focuses its picker.
 *
 * Shared by the log-workout form and the workout-plan form so "add exercise"
 * behaves the same in both: the new row is scrolled to center, and focus moves
 * either into the row (default: its first input) or into the picker dialog
 * that opens on top of it.
 *
 * `resolveCard` is called again on every animation frame until the row's ref
 * is attached: the exercise picker is a client-only dynamic import, so the
 * row's focusable content may not be mounted on the first attempt.
 *
 * Render this inside a reactive boundary that updates when the row list
 * changes (the field render prop, or the state that owns the rows).
 */
export interface ExerciseAutoScrollProps<Id extends string | number> {
  /** Row to scroll to, or null when there's nothing pending. */
  pendingId: Id | null;
  /** Resolves the row's root element; returns null before it mounts. */
  resolveCard: (id: Id) => HTMLElement | null | undefined;
  /** Called once the row has been handled (or given up on). */
  onDone: () => void;
  /** Element inside the row that should receive focus. */
  focusSelector?: string;
  /**
   * When false, the row is only scrolled into view — focus stays wherever it
   * already is. Used when the exercise picker opens right after the row is
   * added, so focus stays inside the dialog's search field.
   */
  focusEnabled?: boolean;
}

const DEFAULT_FOCUS_SELECTOR = "input:not([type='hidden'])";

/** How many frames to wait for the row (and its focus target) to mount. */
const MAX_ATTEMPTS = 10;

export function ExerciseAutoScroll<Id extends string | number>({
  pendingId,
  resolveCard,
  onDone,
  focusSelector = DEFAULT_FOCUS_SELECTOR,
  focusEnabled = true,
}: ExerciseAutoScrollProps<Id>) {
  const resolveCardRef = useRef(resolveCard);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    resolveCardRef.current = resolveCard;
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    if (pendingId == null) return;

    let cancelled = false;
    let frame = 0;
    let attempts = 0;

    const run = () => {
      if (cancelled) return;

      const card = resolveCardRef.current(pendingId);
      if (!card) {
        // Ref not attached yet — retry on the next frame.
        if (attempts++ < MAX_ATTEMPTS) frame = requestAnimationFrame(run);
        else onDoneRef.current();
        return;
      }

      card.scrollIntoView({ behavior: "smooth", block: "center" });

      if (!focusEnabled) {
        onDoneRef.current();
        return;
      }

      const target = card.querySelector<HTMLElement>(focusSelector);
      if (target) {
        target.focus({ preventScroll: true });
        onDoneRef.current();
        return;
      }
      if (attempts++ < MAX_ATTEMPTS) frame = requestAnimationFrame(run);
      else onDoneRef.current();
    };

    frame = requestAnimationFrame(run);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [pendingId, focusEnabled, focusSelector]);

  return null;
}
