import { Apple, Dumbbell, Radio, Ruler, TrendingUp, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { AnimatedProgress } from "@/components/animated/animated-progress";
import { motion, LazyMotion, domAnimation } from "motion/react";
import { landingReveal, reducedMotionVariants } from "./landing-variants";
import { useReducedMotion } from "./useReducedMotion";
import CountingNumber from "@/components/animated/counting-number";

const consoleItems = [
  {
    icon: Dumbbell,
    titleKey: "features.workouts.title",
    detailKey: "features.workouts.metric",
  },
  {
    icon: Apple,
    titleKey: "features.nutrition.title",
    detailKey: "features.nutrition.metric",
  },
  {
    icon: Ruler,
    titleKey: "features.measurements.title",
    detailKey: "features.measurements.metric",
  },
  {
    icon: Users,
    titleKey: "features.coaching.title",
    detailKey: "features.coaching.metric",
  },
] as const;

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
            className="h-auto gap-2 rounded-none border border-foreground bg-foreground px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-background"
          >
            <span
              className="size-1.5 rounded-full bg-background animate-pulse"
              aria-hidden="true"
            />
            <span>+</span>
            <span>
              <CountingNumber number={42} inView inViewMargin="10px" />
            </span>
            <span>%</span>
          </Badge>
        </header>

        <dl className="grid grid-cols-3 divide-x divide-border">
          {[
            [125, t("features.workouts.title")],
            [681, t("features.nutrition.title")],
            [52, t("features.measurements.title")],
          ].map(([value, label]) => (
            <div
              key={label}
              className="flex flex-col gap-1 px-4 py-6 sm:px-6 sm:py-8"
            >
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {label}
              </dt>
              <dd className="font-mono text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
                <CountingNumber
                  number={value as number}
                  fromNumber={0}
                  inView
                  inViewMargin="10px"
                />
              </dd>
            </div>
          ))}
        </dl>

        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-border px-6 py-3 sm:px-8">
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <TrendingUp className="size-4 shrink-0" aria-hidden="true" />
            {t("console.weekly_load")}
          </span>
          <AnimatedProgress value={78} />
        </div>

        <ul className="grid grid-cols-1 divide-y divide-border border-t border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          {consoleItems.map((item, index) => (
            <li
              key={item.titleKey}
              className={[
                "flex items-start gap-4 px-6 py-5 sm:px-8 sm:py-6",
                index % 2 === 0 ? "sm:border-r" : "",
                index < 2 ? "sm:border-b" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <item.icon
                className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {t(item.titleKey)}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {t(item.detailKey)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </motion.div>
    </LazyMotion>
  );
}
