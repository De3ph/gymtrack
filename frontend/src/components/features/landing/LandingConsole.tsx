import { Apple, Dumbbell, Ruler, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion, LazyMotion, domAnimation } from "framer-motion";
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
      <motion.div variants={landingReveal} className="relative">
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/20 via-transparent to-accent/20 blur-2xl" />
      <div className="rounded-[2rem] border border-border bg-card/80 p-4 shadow-2xl shadow-foreground/10 backdrop-blur sm:p-5">
        <div className="grid gap-3">
          <div className="rounded-3xl bg-foreground p-5 text-primary-foreground dark:bg-black dark:text-white sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary-foreground/70">
                  {t("console.kicker")}
                </p>
                <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                  {t("console.title")}
                </h2>
              </div>
              <div className="rounded-2xl bg-primary px-3 py-2 text-sm font-black">
                +42%
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                ["3", "W"],
                ["1.8k", "kcal"],
                ["92", "%"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-2xl bg-primary-foreground/10 p-3"
                >
                  <p className="text-xl font-black">{value}</p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-primary-foreground/70">
                    {label}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-primary-foreground/20">
              <div className="h-full w-[78%] rounded-full bg-accent" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {consoleItems.map((item) => (
              <div
                key={item.titleKey}
                className="rounded-3xl border border-border bg-background p-4"
              >
                <item.icon className="size-5 text-primary" />
                <p className="mt-3 text-sm font-bold">{t(item.titleKey)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(item.detailKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      </motion.div>
    </LazyMotion>
  );
}
