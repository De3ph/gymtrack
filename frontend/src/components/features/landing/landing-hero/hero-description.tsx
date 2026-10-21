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
      className="mt-8 max-w-xl text-pretty text-2xl text-foreground/90"
    >
      {t("hero.description")}
    </motion.p>
  );
}