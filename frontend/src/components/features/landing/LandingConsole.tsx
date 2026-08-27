import {
  Apple,
  Dumbbell,
  Radio,
  Ruler,
  TrendingUp,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { motion, LazyMotion, domAnimation } from "motion/react";
import { landingReveal } from "./landing-variants";

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

  return (
    <LazyMotion features={domAnimation}>
      <motion.div
        variants={landingReveal}
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
            +42%
          </Badge>
        </header>

        <dl className="grid grid-cols-3 divide-x divide-border">
          {[
            ["3", t("features.workouts.title")],
            ["1.8k", t("features.nutrition.title")],
            ["92", t("features.measurements.title")],
          ].map(([value, label]) => (
            <div
              key={label}
              className="flex flex-col gap-1 px-4 py-6 sm:px-6 sm:py-8"
            >
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {label}
              </dt>
              <dd className="font-mono text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-border px-6 py-3 sm:px-8">
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <TrendingUp className="size-4 shrink-0" aria-hidden="true" />
            Weekly load
          </span>
          <div
            className="h-1.5 w-full bg-muted"
            role="progressbar"
            aria-valuenow={78}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Weekly load"
          >
            <div className="h-full w-[78%] bg-foreground" />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground">
            78%
          </span>
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
