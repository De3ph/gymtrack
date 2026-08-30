import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { reducedMotionVariants, textReveal } from "../landing-variants";
import { useReducedMotion } from "../useReducedMotion";

export function HeroDescription() {
  const t = useTranslations("home");
  const reducedMotion = useReducedMotion();
  const revealVariants = reducedMotion ? reducedMotionVariants : textReveal;

  return (
    <motion.p
      variants={revealVariants}
      className="mt-8 max-w-2xl text-pretty text-base font-semibold leading-7 text-muted-foreground sm:text-lg sm:leading-8"
    >
      {t("hero.description")}
    </motion.p>
  );
}