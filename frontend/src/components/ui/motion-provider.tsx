"use client";

import { LazyMotion, domAnimation } from "motion/react";

/**
 * Motion feature provider.
 *
 * Components import their elements from `motion/react-m` (`m.*`) instead of
 * `motion/react` (`motion.*`). The `m` build ships no animation features of
 * its own - it reads them from the nearest `LazyMotion` provider. That keeps
 * the drag/layout feature bundles (and the projection engine they pull in)
 * out of routes that never use them.
 *
 * A `m.*` element rendered without a provider above it silently does nothing:
 * no crash, no animation. So every tree that renders `m.*` needs one of
 * these.
 *
 * This module deliberately imports `domAnimation` only. The layout/drag
 * features live in `@/components/ui/motion-layout-provider`, so routes that
 * never animate a layout never pay for them.
 */

/** Animations plus gestures (hover, tap, focus, in-view). */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>;
}
