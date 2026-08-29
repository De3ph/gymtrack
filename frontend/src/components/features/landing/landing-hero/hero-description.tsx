import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { textReveal } from "../landing-variants";

export function HeroDescription() {
  const t = useTranslations("home");

  return (
    <motion.p
      variants={textReveal}
      className="mt-8 max-w-2xl text-pretty text-base font-semibold leading-7 text-muted-foreground sm:text-lg sm:leading-8"
    >
      {t("hero.description")}
    </motion.p>
  );
}