"use client";

import { motion, LazyMotion, domAnimation } from "motion/react";
import { useTranslations } from "next-intl";
import { landingReveal, reducedMotionVariants } from "./landing-variants";
import { useReducedMotion } from "./useReducedMotion";
import { landingFeatures } from "./landing-features";
import { LandingFeatureItem } from "./LandingFeatureItem";

export function LandingFeatureGrid() {
  const t = useTranslations("home");
  const reducedMotion = useReducedMotion();
  const variants = reducedMotion ? reducedMotionVariants : landingReveal;

  return (
    <LazyMotion features={domAnimation}>
      <motion.div
        variants={variants}
        className="border border-border"
        role="region"
        aria-labelledby="features-heading"
      >
        <header className="flex items-center justify-between border-b border-border px-8 py-6">
          <div>
            <h2
              id="features-heading"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
            >
              {t("features.what_you_log")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("features.header_description")}
            </p>
          </div>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:block">
            {landingFeatures.length} {t("features.domains_label")}
          </span>
        </header>

        <ul className="divide-y divide-border">
          {landingFeatures.map((feature) => (
            <LandingFeatureItem key={feature.id} feature={feature} />
          ))}
        </ul>
      </motion.div>
    </LazyMotion>
  );
}
