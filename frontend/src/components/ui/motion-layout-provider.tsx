"use client";

import { LazyMotion, domMax } from "motion/react";

/**
 * Motion provider that also enables drag and layout projection.
 *
 * `layout`, `layoutId` and drag gestures need the layout/drag features,
 * which are not part of `domAnimation`. Importing them from a separate
 * module keeps them out of the routes that only animate.
 *
 * DO NOT merge this into `motion-provider.tsx`: one module exporting both
 * would pull `domMax` (and the projection engine it drags in) into every
 * route, which is the thing the split exists to avoid.
 *
 * Nested inside a `MotionProvider`: the inner provider wins for its subtree.
 */
export function MotionLayoutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LazyMotion features={domMax}>{children}</LazyMotion>;
}
