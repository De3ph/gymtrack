import { useState, useCallback, useEffect } from "react";

/**
 * Shared filter-bar state: keeps a `pending` copy that only flushes to the
 * parent when the user clicks "Apply".  External filter changes (e.g. from
 * a parent re-render or a clear action) reset the pending copy automatically.
 *
 * Replaces the duplicated `useState` + `useEffect` pattern in
 * WorkoutFilterBar, MealFilterBar, and BodyMeasurementFilterBar.
 *
 * @param value  The authoritative filter object from the parent.
 * @param onChange  Callback to push the applied filter up.
 */
export function useDeferredFilter<T>(
  value: T,
  onChange: (next: T) => void,
) {
  const [pending, setPending] = useState<T>(value);

  // Reset pending copy when the parent pushes a new value.
  useEffect(() => {
    setPending(value);
  }, [value]);

  const isDirty = Object.keys(pending as Record<string, unknown>).some(
    (key) => (pending as Record<string, unknown>)[key] !== (value as Record<string, unknown>)[key],
  );

  const apply = useCallback(() => {
    onChange(pending);
  }, [onChange, pending]);

  const clear = useCallback(
    (empty: T) => {
      setPending(empty);
      onChange(empty);
    },
    [onChange],
  );

  return { pending, setPending, isDirty, apply, clear };
}