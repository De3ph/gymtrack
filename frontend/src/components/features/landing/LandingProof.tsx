import { Activity, BarChart3, Trophy, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/routes";
import { buttonVariants } from "@/components/ui/button";
import { motion } from "motion/react";
import { landingReveal } from "./landing-variants";

export function LandingProof() {
  const t = useTranslations("home");

  return (
    <motion.div
      variants={landingReveal}
      className="border border-border"
      role="region"
      aria-labelledby="proof-heading"
    >
      <div className="grid gap-8 px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {t("proof.kicker")}
          </p>
          <h2
            id="proof-heading"
            className="mt-4 text-balance font-mono text-2xl font-semibold leading-[1.1] tracking-[-0.04em] text-foreground sm:text-4xl"
          >
            {t("proof.title")}
          </h2>
          <p className="mt-6 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
            {t("proof.description")}
          </p>
        </div>

        <div className="flex flex-col justify-between gap-6 border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
          <dl className="grid grid-cols-3 divide-x divide-border lg:grid-cols-1 lg:divide-x-0 lg:divide-y">
            {[
              { value: "247", label: "Reps logged" },
              { value: "12w", label: "Avg. streak" },
              { value: "1:1", label: "Trainer loop" },
            ].map((row) => (
              <div
                key={row.label}
                className="flex flex-col gap-1 px-3 py-3 first:pl-0 last:pr-0 lg:px-0 lg:py-4 lg:first:pt-0 lg:last:pb-0"
              >
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {row.label}
                </dt>
                <dd className="font-mono text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>

          <Link
            href={ROUTES.LOGIN}
            className={buttonVariants({
              variant: "default",
              size: "lg",
              className:
                "w-fit rounded-none border-foreground bg-foreground px-6 font-mono text-xs uppercase tracking-[0.18em] text-background hover:bg-background hover:text-foreground",
            })}
          >
            {t("login")}
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
