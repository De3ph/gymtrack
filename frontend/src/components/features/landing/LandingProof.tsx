import { LineChart } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/routes";
import { motion, LazyMotion, domAnimation } from "motion/react";
import { landingCard } from "./landing-variants";

export function LandingProof() {
  const t = useTranslations("home");

  return (
    <motion.div
      className="mt-4 rounded-[2rem] border border-border bg-foreground p-6 text-primary-foreground dark:bg-black dark:text-white sm:p-8"
      variants={landingCard}
    >
      <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto]">
        <div>
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.24em] text-primary-foreground/70">
            <LineChart className="size-4 text-accent" />
            {t("proof.kicker")}
          </div>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            {t("proof.title")}
          </h2>
          <p className="mt-3 max-w-2xl text-primary-foreground/75">
            {t("proof.description")}
          </p>
        </div>
        <Link
          href={ROUTES.LOGIN}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-black text-primary-foreground transition hover:bg-primary/90"
        >
          {t("login")}
        </Link>
      </div>
    </motion.div>
  );
}
