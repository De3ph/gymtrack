"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  motion,
  useAnimationFrame,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useEffect, useRef } from "react";

/** Moving radial highlight that drifts across the surface. */
function GradientLayer({
  springX,
  springY,
  gradientColor,
  opacity,
  multiplier,
}: {
  springX: MotionValue<number>;
  springY: MotionValue<number>;
  gradientColor: string;
  opacity: number;
  multiplier: number;
}) {
  const x = useTransform(springX, (val) => val * multiplier);
  const y = useTransform(springY, (val) => val * multiplier);
  const background = useMotionTemplate`radial-gradient(circle at ${x}px ${y}px, ${gradientColor} 0%, transparent 55%)`;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{ opacity, background }}
    />
  );
}

export interface NoiseBackgroundProps {
  children?: React.ReactNode;
  /** Classes for the inner content wrapper (the element that holds `children`). */
  className?: string;
  /** Classes for the outer container. Overrides the component defaults. */
  containerClassName?: string;
  gradientColors?: string[];
  /** Overall strength of the gradient wash, 0–1. */
  gradientOpacity?: number;
  noiseIntensity?: number;
  speed?: number;
  backdropBlur?: boolean;
  animating?: boolean;
  /** Ring thickness between the content and the gradient, e.g. `p-1`. */
  padding?: string;
  /** Corner radius that must match the child, e.g. `rounded-none`. */
  radius?: string;
  /** Optional animated accent bar along the top edge of the ring. */
  showTopStrip?: boolean;
}

export const NoiseBackground = ({
  children,
  className,
  containerClassName,
  gradientColors = [
    "var(--red-500)",
    "var(--teal-500)",
    "var(--amber-500)",
  ],
  gradientOpacity = 1,
  noiseIntensity = 0.2,
  speed = 0.1,
  backdropBlur = false,
  animating = true,
  padding = "p-1",
  radius = "rounded-2xl",
  showTopStrip = false,
}: NoiseBackgroundProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth out the raw pointer-free drift so the highlights glide.
  const springX = useSpring(x, { stiffness: 100, damping: 30 });
  const springY = useSpring(y, { stiffness: 100, damping: 30 });

  const topGradientX = useTransform(springX, (val) => val * 0.1 - 50);

  const velocityRef = useRef({ x: 0, y: 0 });
  const lastDirectionChangeRef = useRef(0);
  const lastFrameRef = useRef<number | null>(null);
  const centeredRef = useRef(false);

  const prefersReducedMotion = useReducedMotion();
  const isAnimating = animating && !prefersReducedMotion;

  // Park the highlight in the middle of the box so the first paint is never
  // anchored at the top-left corner.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const { width, height } = container.getBoundingClientRect();
    x.set(width / 2);
    y.set(height / 2);
    centeredRef.current = true;

    lastFrameRef.current = null;
  }, [x, y]);

  // Re-randomize the drift direction whenever the speed changes.
  useEffect(() => {
    const angle = Math.random() * Math.PI * 2;
    const magnitude = speed * (0.5 + Math.random() * 0.5);
    velocityRef.current = {
      x: Math.cos(angle) * magnitude,
      y: Math.sin(angle) * magnitude,
    };
    lastDirectionChangeRef.current = 0;
  }, [speed]);

  useAnimationFrame((time) => {
    const container = containerRef.current;
    if (!container) return;

    const { width, height } = container.getBoundingClientRect();

    if (!isAnimating) {
      if (!centeredRef.current && width > 0 && height > 0) {
        x.set(width / 2);
        y.set(height / 2);
        centeredRef.current = true;
      }
      return;
    }

    if (!centeredRef.current && width > 0 && height > 0) {
      x.set(width / 2);
      y.set(height / 2);
      centeredRef.current = true;
    }

    // Real frame delta instead of a hardcoded 16ms.
    const previous = lastFrameRef.current;
    lastFrameRef.current = time;
    const delta = previous === null ? 16 : Math.min(time - previous, 64);

    // Pick a new heading every 1.5–3s so the drift never feels periodic.
    if (time - lastDirectionChangeRef.current > 1500 + Math.random() * 1500) {
      const angle = Math.random() * Math.PI * 2;
      const magnitude = speed * (0.5 + Math.random() * 0.5);
      velocityRef.current = {
        x: Math.cos(angle) * magnitude,
        y: Math.sin(angle) * magnitude,
      };
      lastDirectionChangeRef.current = time;
    }

    const padding = 20; // keep the highlight off the edges
    const maxX = Math.max(width - padding, padding);
    const maxY = Math.max(height - padding, padding);

    let newX = x.get() + velocityRef.current.x * delta;
    let newY = y.get() + velocityRef.current.y * delta;

    // Bounce off the edges with a fresh random heading.
    if (newX < padding || newX > maxX || newY < padding || newY > maxY) {
      const angle = Math.random() * Math.PI * 2;
      const magnitude = speed * (0.5 + Math.random() * 0.5);
      velocityRef.current = {
        x: Math.cos(angle) * magnitude,
        y: Math.sin(angle) * magnitude,
      };
      lastDirectionChangeRef.current = time;
      newX = Math.min(Math.max(newX, padding), maxX);
      newY = Math.min(Math.max(newY, padding), maxY);
    }

    x.set(newX);
    y.set(newY);
  });

  return (
    <div
      ref={containerRef}
      className={cn(
        // Hug the child on both axes instead of stretching to the parent.
        "group relative isolate inline-flex w-fit max-w-full",
        "overflow-hidden",
        padding,
        radius,
        "shadow-[0px_0.5px_1px_0px_var(--color-neutral-400)_inset,0px_1px_0px_0px_var(--color-neutral-100)]",
        "dark:shadow-[0px_1px_0px_0px_var(--color-neutral-950)_inset,0px_1px_0px_0px_var(--color-neutral-800)]",
        backdropBlur &&
          "after:absolute after:inset-0 after:z-0 after:backdrop-blur-lg after:content-['']",
        containerClassName,
      )}
      style={{ "--noise-opacity": noiseIntensity } as React.CSSProperties}
    >
      {/* Base wash so the ring reads as one continuous gradient. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0.18 * gradientOpacity,
          background: `linear-gradient(120deg, ${gradientColors.join(", ")})`,
        }}
      />

      {/* Moving gradient layers */}
      <GradientLayer
        springX={springX}
        springY={springY}
        gradientColor={gradientColors[0]}
        opacity={0.4 * gradientOpacity}
        multiplier={1}
      />
      <GradientLayer
        springX={springX}
        springY={springY}
        gradientColor={gradientColors[1]}
        opacity={0.3 * gradientOpacity}
        multiplier={0.7}
      />
      <GradientLayer
        springX={springX}
        springY={springY}
        gradientColor={gradientColors[2] || gradientColors[0]}
        opacity={0.25 * gradientOpacity}
        multiplier={1.2}
      />

      {/* Static noise texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <Image
          src="/images/noise.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-[var(--noise-opacity)]"
          style={{ mixBlendMode: "overlay" }}
        />
      </div>

      {/* Optional accent bar, inset to the ring so it never overlaps content */}
      {showTopStrip ? (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(to right, ${gradientColors.join(", ")})`,
            opacity: 0.8 * gradientOpacity,
            x: isAnimating ? topGradientX : 0,
          }}
        />
      ) : null}

      {/* Content sits above every decorative layer and fills the container. */}
      <div className={cn("relative z-10 flex w-full min-w-0", className)}>
        {children}
      </div>
    </div>
  );
};