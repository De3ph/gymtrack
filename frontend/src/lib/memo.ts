import { memo } from "react";

/**
 * Shallow-equality check for two objects.
 * Returns true when every key in `a` strictly equals the corresponding key in `b`.
 */
function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  if (a === b) return true;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i]!;
    if (a[key] !== b[key]) return false;
  }
  return true;
}

/**
 * Wraps a component with `React.memo` using an optional custom comparator.
 *
 * Usage:
 * ```tsx
 * export const MealCard = memoComponent(MealCardImpl, (a, b) =>
 *   a.meal.mealId === b.meal.mealId &&
 *   a.expandedCommentsId === b.expandedCommentsId,
 * );
 * ```
 */
export function memoComponent<P extends object>(
  Component: React.FC<P>,
  propsAreEqual?: (a: P, b: P) => boolean,
) {
  return memo(Component, propsAreEqual ?? ((a, b) => shallowEqual(a as Record<string, unknown>, b as Record<string, unknown>)));
}