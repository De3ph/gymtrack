import {
  Apple,
  Dumbbell,
  Flame,
  Ruler,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { motion, LazyMotion, domAnimation } from "motion/react";
import { landingReveal, reducedMotionVariants } from "./landing-variants";
import { useReducedMotion } from "./useReducedMotion";
import { Badge } from "@/components/ui/badge";
import { memo } from "react";

const featureKeys = [
  {
    icon: Dumbbell,
    titleKey: "features.workouts.title",
    descriptionKey: "features.workouts.description",
    metricKey: "features.workouts.metric",
    exampleKey: "features.workouts.example",
  },
  {
    icon: Apple,
    titleKey: "features.nutrition.title",
    descriptionKey: "features.nutrition.description",
    metricKey: "features.nutrition.metric",
    exampleKey: "features.nutrition.example",
  },
  {
    icon: Ruler,
    titleKey: "features.measurements.title",
    descriptionKey: "features.measurements.description",
    metricKey: "features.measurements.metric",
    exampleKey: "features.measurements.example",
  },
  {
    icon: Users,
    titleKey: "features.coaching.title",
    descriptionKey: "features.coaching.description",
    metricKey: "features.coaching.metric",
    exampleKey: "features.coaching.example",
  },
] as const;

interface ExampleCardProps {
  icon: (typeof featureKeys)[number]["icon"];
  badge: string;
  example: {
    label: string;
    title: string;
    subtitle: string;
    extras: string[];
  };
}

const ExampleCard = memo(function ExampleCard({ icon: Icon, badge, example }: ExampleCardProps) {
  return (
    <div className="mt-6 rounded-lg border border-border bg-muted/30 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {example.label}
          </span>
        </div>
        <Badge
          variant="outline"
          className="rounded-none border-border bg-background px-2 py-0 font-mono text-[10px] uppercase tracking-wider"
        >
          {badge}
        </Badge>
      </div>

      <div className="mt-4 space-y-1">
        <p className="font-semibold text-foreground">{example.title}</p>
        <p className="font-mono text-xs text-muted-foreground">
          {example.subtitle}
        </p>
      </div>

      <div className="mt-4 space-y-1.5">
        {example.extras.map((extra, i) => (
          <div key={`extra-${i}-${extra}`} className="flex items-center gap-2">
            <span className="size-1 rounded-full bg-muted-foreground/40" />
            <span className="text-xs text-muted-foreground">{extra}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

ExampleCard.displayName = "ExampleCard";

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
            {featureKeys.length} {t("features.domains_label")}
          </span>
        </header>

        <ul className="divide-y divide-border">
          {featureKeys.map((feature) => {
            const Icon = feature.icon;
            const example = {
              label: t(`${feature.exampleKey}.label`),
              title: t(`${feature.exampleKey}.title`),
              subtitle: t(`${feature.exampleKey}.subtitle`),
              extras: [
                t(`${feature.exampleKey}.extra1`),
                t(`${feature.exampleKey}.extra2`),
              ],
            };
            const badge = t(`${feature.exampleKey}.badge`);
            return (
              <li
                key={feature.titleKey}
                className="px-8 py-10 transition-colors hover:bg-muted/20"
                style={{ contentVisibility: "auto" }}
              >
                <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-start">
                  <div className="flex items-start gap-6">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50">
                      <Icon
                        className="size-5 text-foreground"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {t(feature.titleKey)}
                      </h3>
                      <p className="mt-3 leading-relaxed text-muted-foreground">
                        {t(feature.descriptionKey)}
                      </p>
                      <div className="mt-6 flex items-center gap-4">
                        <div>
                          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                            {t("features.output")}
                          </span>
                          <p className="mt-1 font-mono text-sm font-medium text-foreground">
                            {t(feature.metricKey)}
                          </p>
                        </div>
                        <div className="h-8 w-px bg-border" />
                        <div className="flex items-center gap-2 text-muted-foreground">
                          {feature.icon === Dumbbell ? (
                            <>
                              <TrendingUp className="size-4" />
                              <span className="text-xs">{t("features.stats_workouts")}</span>
                            </>
                          ) : null}
                          {feature.icon === Apple ? (
                            <>
                              <Flame className="size-4" />
                              <span className="text-xs">{t("features.stats_nutrition")}</span>
                            </>
                          ) : null}
                          {feature.icon === Ruler ? (
                            <>
                              <TrendingDown className="size-4" />
                              <span className="text-xs">{t("features.stats_measurements")}</span>
                            </>
                          ) : null}
                          {feature.icon === Users ? (
                            <>
                              <Users className="size-4" />
                              <span className="text-xs">{t("features.stats_coaching")}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <ExampleCard icon={feature.icon} badge={badge} example={example} />
                </div>
              </li>
            );
          })}
        </ul>
      </motion.div>
    </LazyMotion>
  );
}
