import { ArrowRight, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/routes";
import { motion, LazyMotion, domAnimation } from "motion/react";
import { landingReveal } from "./landing-variants";
import { LandingMetrics } from "./LandingMetrics";

export function LandingHero() {
  const t = useTranslations("home");

  return (
    <LazyMotion features={domAnimation}>
      <motion.div className="max-w-3xl" variants={landingReveal}>
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground shadow-sm backdrop-blur">
          <ShieldCheck className="size-3.5 text-accent" />
          {t("eyebrow_badge")}
        </div>

        <h1 className="max-w-5xl text-5xl font-black tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          {t("hero.title")}
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
          {t("hero.description")}
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link
            href={ROUTES.REGISTER}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
          >
            {t("sign_up")}
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href={ROUTES.LOGIN}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-base font-bold text-foreground shadow-sm transition hover:bg-muted"
          >
            {t("login")}
          </Link>
        </div>

        <LandingMetrics />
      </motion.div>
    </LazyMotion>
  );
}
