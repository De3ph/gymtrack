import type { Variants } from "motion/react";

export const reducedMotionVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
};

/**
 * Reveal props for a section whose content is mounted lazily.
 *
 * The landing sections are `next/dynamic` with `ssr: false`, so their content
 * can mount at any point in the page's life. A parent that owns `whileInView`
 * with `viewport.once` latches its trigger the first time it scrolls into
 * view, and a child that mounts *after* that latch never receives the
 * "visible" variant - it sits at `hidden` (opacity 0) for good, leaving the
 * section rendered but empty.
 *
 * Putting the trigger on the element that actually mounts removes the
 * dependency on chunk timing: the content reveals itself the first time it
 * scrolls into view, and `once` keeps it revealed from then on. The parent
 * `<m.section>` keeps its own reveal, so the band and its content still fade
 * in together.
 */
export const revealOnView = {
  initial: "hidden",
  whileInView: "visible",
  viewport: { once: true, margin: "-80px" },
} as const;

export const landingStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.12,
    },
  },
};

export const landingReveal: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" },
  },
};

export const landingCard: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

export const textReveal: Variants = {
  hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export const textStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.08 },
  },
};

export const featureGridItemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 20,
    },
  },
};
