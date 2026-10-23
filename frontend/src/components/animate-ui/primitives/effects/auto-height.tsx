'use client';

import * as React from 'react';
import {
  type HTMLMotionProps,
  type LegacyAnimationControls,
  type TargetAndTransition,
  type Transition,
} from 'motion/react';
import * as m from 'motion/react-m';

import { useAutoHeight } from '@/hooks/use-auto-height';
import { Slot, WithAsChild } from '@/components/animate-ui/primitives/animate/slot';
import { MotionProvider } from '@/components/ui/motion-provider';

type AutoHeightProps = WithAsChild<
  {
    children: React.ReactNode;
    deps?: React.DependencyList;
    animate?: TargetAndTransition | LegacyAnimationControls;
    transition?: Transition;
  } & Omit<HTMLMotionProps<'div'>, 'animate'>
>;

function AutoHeight({
  children,
  deps = [],
  transition = {
    type: 'spring',
    stiffness: 300,
    damping: 30,
    bounce: 0,
    restDelta: 0.01,
  },
  style,
  animate,
  asChild = false,
  ...props
}: AutoHeightProps) {
  const { ref, height } = useAutoHeight<HTMLDivElement>(deps);

  const Comp = asChild ? Slot : m.div;

  return (
    // `m.div` is a motion element: it needs a LazyMotion ancestor to pick up
    // its features, otherwise it renders unanimated.
    <MotionProvider>
      <Comp
        style={{ overflow: 'hidden', ...style }}
        animate={{ height, ...animate }}
        transition={transition}
        {...props}
      >
        <div ref={ref}>{children}</div>
      </Comp>
    </MotionProvider>
  );
}

export { AutoHeight, type AutoHeightProps };
