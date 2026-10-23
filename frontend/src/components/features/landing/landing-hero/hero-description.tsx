import { useTranslations } from "next-intl";
import * as m from "motion/react-m";
import { reducedMotionVariants, textReveal } from "../landing-variants";
import { useReducedMotion } from "../useReducedMotion";

export function HeroDescription() {
  const t = useTranslations("home");
  const reducedMotion = useReducedMotion();
  const revealVariants = reducedMotion ? reducedMotionVariants : textReveal;

  return (
    <m.p
      variants={revealVariants}
      className="mt-8 max-w-xl text-pretty text-2xl text-foreground/90"
    >
      {t("hero.description")}
    </m.p>
  );
}