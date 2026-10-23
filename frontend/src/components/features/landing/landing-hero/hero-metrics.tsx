import { Activity, BarChart3, UsersRound, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import * as m from "motion/react-m";
import { reducedMotionVariants, textReveal, textStagger } from "../landing-variants";
import { useReducedMotion } from "../useReducedMotion";

export function HeroMetrics() {
  const t = useTranslations("home");
  const reducedMotion = useReducedMotion();
  const staggerVariants = reducedMotion ? reducedMotionVariants : textStagger;
  const revealVariants = reducedMotion ? reducedMotionVariants : textReveal;

  const metrics: { value: string; label: string; Icon: LucideIcon }[] = [
    {
      value: t("metrics.roles.value"),
      label: t("metrics.roles.label"),
      Icon: UsersRound,
    },
    {
      value: t("metrics.track.value"),
      label: t("metrics.track.label"),
      Icon: Activity,
    },
    {
      value: t("metrics.coach.value"),
      label: t("metrics.coach.label"),
      Icon: BarChart3,
    },
  ];

  return (
    <m.dl
      variants={staggerVariants}
      className="mt-16 grid max-w-3xl grid-cols-3 divide-x divide-border border-y border-border"
    >
      {metrics.map((metric) => (
        <m.div
          key={metric.label}
          variants={revealVariants}
          className="flex flex-col gap-2 px-4 py-5 sm:px-6 sm:py-6"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <metric.Icon className="size-4 shrink-0" aria-hidden="true" />
            <dt>{metric.label}</dt>
          </div>
          <dd className="text-4xl font-medium tabular-nums text-foreground sm:text-5xl">
            {metric.value}
          </dd>
        </m.div>
      ))}
    </m.dl>
  );
}