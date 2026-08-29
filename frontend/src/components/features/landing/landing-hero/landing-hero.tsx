import { motion, LazyMotion, domAnimation } from "motion/react";
import { landingReveal } from "../landing-variants";
import { HeroTitle } from "./hero-title";
import { HeroDescription } from "./hero-description";
import { HeroActions } from "./hero-actions";
import { HeroMetrics } from "./hero-metrics";

export function LandingHero() {
  return (
    <LazyMotion features={domAnimation}>
      <motion.div className="max-w-5xl" variants={landingReveal}>
        <HeroTitle />
        <HeroDescription />
        <HeroActions />
        <HeroMetrics />
      </motion.div>
    </LazyMotion>
  );
}