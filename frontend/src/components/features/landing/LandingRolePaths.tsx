import { ArrowRight, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/routes";
import { motion } from "motion/react";
import { landingCard, landingStagger } from "./landing-variants";

const roleKeys = ["athlete", "trainer"] as const;

export function LandingRolePaths() {
  const t = useTranslations("home");

  return (
    <motion.div
      className="mt-4 grid gap-4 lg:grid-cols-2"
      variants={landingStagger}
    >
      {roleKeys.map((role) => (
        <motion.article
          key={role}
          className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-8"
          variants={landingCard}
        >
          <div className="absolute right-[-4rem] top-[-4rem] size-32 rounded-full bg-accent/10 blur-2xl" />
          <p className="text-xs font-black uppercase tracking-[0.24em] text-accent">
            {t(`role_paths.${role}.kicker`)}
          </p>
          <h3 className="mt-4 text-3xl font-black tracking-tight">
            {t(`role_paths.${role}.title`)}
          </h3>
          <p className="mt-4 max-w-xl text-muted-foreground">
            {t(`role_paths.${role}.description`)}
          </p>
          <ul className="mt-6 space-y-3">
            {[0, 1, 2].map((index) => (
              <li key={index} className="flex gap-3 text-sm">
                <TrendingUp className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{t(`role_paths.${role}.bullets.${index}`)}</span>
              </li>
            ))}
          </ul>
          <Link
            href={ROUTES.REGISTER}
            className="mt-8 inline-flex items-center gap-2 rounded-lg border border-border px-5 py-3 text-sm font-black transition hover:border-primary hover:text-primary"
          >
            {t(`role_paths.${role}.cta`)}
            <ArrowRight className="size-4" />
          </Link>
        </motion.article>
      ))}
    </motion.div>
  );
}
