import * as m from "motion/react-m";
import { MotionProvider } from "@/components/ui/motion-provider";
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
    <MotionProvider>
      <m.div className="max-w-5xl" variants={variants}>
        <HeroTitle />
        <HeroDescription />
        <HeroActions />
        <HeroMetrics />
      </m.div>
    </MotionProvider>
  );
}