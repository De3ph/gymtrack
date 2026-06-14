import { useTranslations } from "next-intl";

const metricKeys = ["metrics.roles", "metrics.track", "metrics.coach"] as const;

export function LandingMetrics() {
  const t = useTranslations("home");

  return (
    <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
      {metricKeys.map((metric) => (
        <div
          key={metric}
          className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm backdrop-blur"
        >
          <p className="text-2xl font-black text-foreground">
            {t(`${metric}.value`)}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t(`${metric}.label`)}
          </p>
        </div>
      ))}
    </div>
  );
}
