import { Apple, Dumbbell, Radio, Ruler, TrendingUp, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { AnimatedProgress } from "@/components/animated/animated-progress";
import {
  BentoGrid,
  BentoItem,
  BentoItemDescription,
  BentoItemHeader,
  BentoItemIcon,
  BentoItemMedia,
  BentoItemMeta,
  BentoItemMetric,
  BentoItemPattern,
  BentoItemTitle,
} from "@/components/ui/bento-grid";
import { motion, LazyMotion, domAnimation } from "motion/react";
import { landingReveal, reducedMotionVariants } from "./landing-variants";
import { useReducedMotion } from "./useReducedMotion";
import CountingNumber from "@/components/animated/counting-number";

const consoleStats = [
  {
    value: 125,
    titleKey: "features.workouts.title",
    metricKey: "features.workouts.metric",
  },
  {
    value: 681,
    titleKey: "features.nutrition.title",
    metricKey: "features.nutrition.metric",
  },
  {
    value: 52,
    titleKey: "features.measurements.title",
    metricKey: "features.measurements.metric",
  },
] as const;

const countTransition = { stiffness: 150, damping: 28 };

export function LandingConsole() {
  const t = useTranslations("home");
  const reducedMotion = useReducedMotion();
  const variants = reducedMotion ? reducedMotionVariants : landingReveal;

  return (
    <LazyMotion features={domAnimation}>
      <motion.div
        variants={variants}
        className="border border-border"
        role="region"
        aria-labelledby="console-heading"
      >
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-6 py-5 sm:px-8 sm:py-6">
          <div>
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <Radio className="size-4 shrink-0" aria-hidden="true" />
              <span>{t("console.kicker")}</span>
            </p>
            <h2
              id="console-heading"
              className="mt-2 font-mono text-2xl font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-3xl"
            >
              {t("console.title")}
            </h2>
          </div>
          <Badge
            variant="default"
            className="h-auto gap-0.5 rounded-lg border border-foreground bg-foreground px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-background"
          >
            <span>+</span>
            <span>
              <CountingNumber
                number={42}
                inView
                inViewMargin="10px"
                transition={countTransition}
              />
            </span>
            <span>%</span>
          </Badge>
        </header>

        <BentoGrid columns={4} density="compact" className="p-3 sm:p-4">
          {consoleStats.map((stat) => (
            <BentoItem key={stat.titleKey} tone="surface">
              <BentoItemMeta>{t(stat.titleKey)}</BentoItemMeta>
              <BentoItemMetric
                value={
                  <CountingNumber
                    number={stat.value}
                    fromNumber={0}
                    inView
                    inViewMargin="10px"
                    transition={countTransition}
                  />
                }
                label={t(stat.metricKey)}
                className="mt-auto"
              />
            </BentoItem>
          ))}

          <BentoItem tone="inverse">
            <BentoItemHeader>
              <BentoItemMeta className="inline-flex items-center gap-2">
                <TrendingUp className="size-3.5" aria-hidden="true" />
                {t("console.weekly_load")}
              </BentoItemMeta>
            </BentoItemHeader>
            <p className="mt-4 font-heading text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
              78%
            </p>
            <AnimatedProgress
              value={78}
              className="mt-auto rounded-sm bg-current/15"
              indicatorClassName="rounded-sm bg-current"
            />
          </BentoItem>

          <BentoItem span="2x2" tone="muted">
            <BentoItemPattern variant="grid" />
            <BentoItemHeader>
              <BentoItemIcon>
                <Dumbbell />
              </BentoItemIcon>
              <BentoItemMeta>{t("features.workouts.metric")}</BentoItemMeta>
            </BentoItemHeader>
            <BentoItemTitle>{t("features.workouts.title")}</BentoItemTitle>
            <BentoItemDescription>
              {t("features.workouts.description")}
            </BentoItemDescription>

            <BentoItemMedia className="mt-5 border-current/15 bg-background/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <BentoItemMeta>
                  {t("features.workouts.example.label")}
                </BentoItemMeta>
                <Badge
                  variant="outline"
                  className="rounded-lg border-border bg-background px-2 py-0 font-mono text-[10px] uppercase tracking-wider"
                >
                  {t("features.workouts.example.badge")}
                </Badge>
              </div>
              <p className="mt-4 font-semibold text-foreground">
                {t("features.workouts.example.title")}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {t("features.workouts.example.subtitle")}
              </p>
              <ul className="mt-4 space-y-1.5 border-l border-border pl-3">
                <li className="text-xs text-muted-foreground">
                  {t("features.workouts.example.extra1")}
                </li>
                <li className="text-xs text-muted-foreground">
                  {t("features.workouts.example.extra2")}
                </li>
              </ul>
            </BentoItemMedia>
          </BentoItem>

          <BentoItem tone="surface">
            <BentoItemHeader>
              <BentoItemIcon>
                <Apple />
              </BentoItemIcon>
              <BentoItemMeta>{t("features.nutrition.metric")}</BentoItemMeta>
            </BentoItemHeader>
            <BentoItemTitle>{t("features.nutrition.title")}</BentoItemTitle>
            <BentoItemDescription className="mt-auto font-mono text-xs">
              {t("features.nutrition.example.subtitle")}
            </BentoItemDescription>
          </BentoItem>

          <BentoItem tone="surface">
            <BentoItemHeader>
              <BentoItemIcon>
                <Ruler />
              </BentoItemIcon>
              <BentoItemMeta>{t("features.measurements.metric")}</BentoItemMeta>
            </BentoItemHeader>
            <BentoItemTitle>{t("features.measurements.title")}</BentoItemTitle>
            <BentoItemDescription className="mt-auto font-mono text-xs">
              {t("features.measurements.example.subtitle")}
            </BentoItemDescription>
          </BentoItem>

          <BentoItem span="2x1" tone="accent">
            <BentoItemHeader>
              <BentoItemIcon>
                <Users />
              </BentoItemIcon>
              <BentoItemMeta>{t("features.coaching.metric")}</BentoItemMeta>
            </BentoItemHeader>
            <BentoItemTitle>{t("features.coaching.title")}</BentoItemTitle>
            <BentoItemDescription>
              {t("features.coaching.description")}
            </BentoItemDescription>
          </BentoItem>
        </BentoGrid>
      </motion.div>
    </LazyMotion>
  );
}
