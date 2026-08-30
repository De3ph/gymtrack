import { motion, LazyMotion, domAnimation } from "motion/react";
import { landingReveal, reducedMotionVariants } from "../landing-variants";
import { useReducedMotion } from "../useReducedMotion";
import { HeroTitle } from "./hero-title";
import { HeroDescription } from "./hero-description";
import { HeroActions } from "./hero-actions";
import { HeroMetrics } from "./hero-metrics";

export function LandingHero() {
  const reducedMotion = useReducedMotion();
  const variants = reducedMotion ? reducedMotionVariants : landingReveal;

  return (
    <LazyMotion features={domAnimation}>
      <motion.div className="max-w-5xl" variants={variants}>
        <HeroTitle />
        <HeroDescription />
        <HeroActions />
        <HeroMetrics />
      </motion.div>
    </LazyMotion>
  );
}