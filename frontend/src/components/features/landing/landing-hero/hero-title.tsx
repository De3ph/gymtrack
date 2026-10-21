import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { reducedMotionVariants, textReveal, textStagger } from "../landing-variants";
import { useReducedMotion } from "../useReducedMotion";

export function HeroTitle() {
  const t = useTranslations("home");
  const title = t("hero.title");
  const reducedMotion = useReducedMotion();
  const staggerVariants = reducedMotion ? reducedMotionVariants : textStagger;
  const revealVariants = reducedMotion ? reducedMotionVariants : textReveal;
  const words = title.split(" ");

  return (
    <motion.h1
      id="hero-heading"
      variants={staggerVariants}
      initial="hidden"
      animate="visible"
      className="text-balance font-display text-4xl font-medium tracking-tight text-foreground sm:text-6xl lg:text-8xl"
    >
      {/* Each word animates on its own, but the spaces between them stay in
          the DOM as real text nodes — a margin-only gap produced an h1 whose
          textContent read "Trainsmarter.Coachclearer." to screen readers and
          to anyone copying from the page. */}
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          <motion.span variants={revealVariants} className="inline-block">
            {word}
          </motion.span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </motion.h1>
  );
}
