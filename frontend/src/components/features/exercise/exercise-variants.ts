import type { Variants } from "motion/react";

export const exerciseStagger: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.03, delayChildren: 0 },
  },
};

export const exerciseReveal: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" },
  },
};

export const exerciseRevealReduced: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.12, ease: "easeOut" },
  },
};

/**
 * How many cards reveal in sequence before the rest appear at once.
 *
 * This is a cost guard, not a style choice. A container-orchestrated stagger
 * derives each child's delay from its index, so the full catalog (58 seeded
 * rows, ~870 after `cmd/import-exercises`) would hold the last tile back for
 * 26 seconds and replay the whole ramp every time a "load more" batch is
 * appended. Past the first screen the stagger communicates nothing anyway —
 * nobody watches card 40 arrive.
 */
const REVEAL_STEPS = 12;
const REVEAL_STEP_SECONDS = 0.03;

const steppedReveal: Variants[] = Array.from(
  { length: REVEAL_STEPS },
  (_, index) => ({
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.2,
        ease: "easeOut",
        delay: index * REVEAL_STEP_SECONDS,
      },
    },
  }),
);

/**
 * Reveal variant for the card at `index` in the rendered list.
 *
 * Self-contained rather than inherited from a parent variants container: a card
 * appended by "load more" then animates on its own clock instead of inheriting
 * the parent's stagger index, which is what turns an append into a long wait.
 * Indexes past the cap fall back to the undelayed reveal.
 */
export function exerciseCardReveal(index: number): Variants {
  return index < REVEAL_STEPS ? steppedReveal[index] : exerciseReveal;
}
