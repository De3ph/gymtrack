"use client";

import * as m from "motion/react-m";
import { MotionProvider } from "@/components/ui/motion-provider";
import { useTranslations } from "next-intl";
import { landingReveal, reducedMotionVariants, revealOnView } from "./landing-variants";
import { useReducedMotion } from "./useReducedMotion";
import { landingFeatures } from "./landing-features";
import { LandingFeatureItem } from "./LandingFeatureItem";

export function LandingFeatureGrid() {
  const t = useTranslations("home");
  const reducedMotion = useReducedMotion();
  const variants = reducedMotion ? reducedMotionVariants : landingReveal;

  return (
    <MotionProvider>
      <m.div
        variants={variants}
        {...revealOnView}
        className="border border-border"
        role="region"
        aria-labelledby="features-heading"
      >
        <header className="flex items-center justify-between border-b border-border px-8 py-8">
          <div>
            <h2
              id="features-heading"
              className="text-4xl font-medium text-foreground"
            >
              {t("features.what_you_log")}
            </h2>
            <p className="mt-3 max-w-xl text-pretty text-2xl text-muted-foreground">
              {t("features.header_description")}
            </p>
          </div>
          <span className="hidden text-sm font-medium text-muted-foreground sm:block">
            {landingFeatures.length} {t("features.domains_label")}
          </span>
        </header>

        <ul className="divide-y divide-border">
          {landingFeatures.map((feature) => (
            <LandingFeatureItem key={feature.id} feature={feature} />
          ))}
        </ul>
      </m.div>
    </MotionProvider>
  );
}
