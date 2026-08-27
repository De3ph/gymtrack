import { Apple, Dumbbell, Ruler, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion, LazyMotion, domAnimation } from "motion/react";
import { landingReveal } from "./landing-variants";

const featureKeys = [
  {
    icon: Dumbbell,
    titleKey: "features.workouts.title",
    descriptionKey: "features.workouts.description",
    metricKey: "features.workouts.metric",
  },
  {
    icon: Apple,
    titleKey: "features.nutrition.title",
    descriptionKey: "features.nutrition.description",
    metricKey: "features.nutrition.metric",
  },
  {
    icon: Ruler,
    titleKey: "features.measurements.title",
    descriptionKey: "features.measurements.description",
    metricKey: "features.measurements.metric",
  },
  {
    icon: Users,
    titleKey: "features.coaching.title",
    descriptionKey: "features.coaching.description",
    metricKey: "features.coaching.metric",
  },
] as const;

export function LandingFeatureGrid() {
  const t = useTranslations("home");

  return (
    <LazyMotion features={domAnimation}>
      <motion.div
        variants={landingReveal}
        className="border border-border"
        role="region"
        aria-labelledby="features-heading"
      >
        <header className="flex items-center justify-between border-b border-border px-6 py-4 sm:px-8">
          <h2
            id="features-heading"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
          >
            What you log
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {featureKeys.length} domains
          </span>
        </header>

        <ul className="divide-y divide-border">
          {featureKeys.map((feature) => {
            const Icon = feature.icon;
            return (
              <li
                key={feature.titleKey}
                className="grid grid-cols-[auto_1fr] items-start gap-x-6 gap-y-3 px-6 py-6 transition-colors hover:bg-muted/40 sm:grid-cols-[auto_1.4fr_1.4fr_auto] sm:gap-x-10 sm:px-8 sm:py-8"
              >
                <Icon
                  className="mt-1 size-4 shrink-0 text-foreground"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {t(feature.titleKey)}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {t(feature.descriptionKey)}
                  </p>
                </div>
                <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Output
                  </span>
                  <span className="font-mono text-sm text-foreground">
                    {t(feature.metricKey)}
                  </span>
                </div>
                <span
                  className="hidden self-center font-mono text-xs text-muted-foreground sm:block"
                  aria-hidden="true"
                >
                  →
                </span>
              </li>
            );
          })}
        </ul>
      </motion.div>
    </LazyMotion>
  );
}
