import { Activity, BarChart3, UsersRound, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { textReveal, textStagger } from "../landing-variants";

export function HeroMetrics() {
  const t = useTranslations("home");

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
    <motion.dl
      variants={textStagger}
      className="mt-16 grid max-w-3xl grid-cols-3 divide-x divide-border border-y border-border"
    >
      {metrics.map((metric) => (
        <motion.div
          key={metric.label}
          variants={textReveal}
          className="flex flex-col gap-2 px-4 py-5 sm:px-6 sm:py-6"
        >
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <metric.Icon className="size-4 shrink-0" aria-hidden="true" />
            <dt>{metric.label}</dt>
          </div>
          <dd className="font-mono text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {metric.value}
          </dd>
        </motion.div>
      ))}
    </motion.dl>
  );
}