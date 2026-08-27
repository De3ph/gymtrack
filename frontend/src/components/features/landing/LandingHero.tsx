import {
  Activity,
  ArrowRight,
  BarChart3,
  UsersRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/routes";
import { buttonVariants } from "@/components/ui/button";
import { motion, LazyMotion, domAnimation } from "motion/react";
import { landingReveal, textReveal, textStagger } from "./landing-variants";

export function LandingHero() {
  const t = useTranslations("home");
  const title = t("hero.title");

  return (
    <LazyMotion features={domAnimation}>
      <motion.div className="max-w-5xl" variants={landingReveal}>
        <motion.h1
          id="hero-heading"
          variants={textStagger}
          initial="hidden"
          animate="visible"
          className="text-balance font-mono text-[2.5rem] font-medium leading-[1.05] tracking-[-0.04em] text-foreground sm:text-6xl lg:text-[5.5rem]"
        >
          {title.split(" ").map((word, i) => (
            <motion.span
              key={`${word}-${i}`}
              variants={textReveal}
              className="inline-block"
              style={{ marginRight: "0.22em" }}
            >
              {word}
            </motion.span>
          ))}
        </motion.h1>

        <motion.p
          variants={textReveal}
          className="mt-8 max-w-2xl text-pretty text-base font-semibold leading-7 text-muted-foreground sm:text-lg sm:leading-8"
        >
          {t("hero.description")}
        </motion.p>

        <motion.div
          variants={textStagger}
          className="mt-12 flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <motion.div variants={textReveal}>
            <Link
              href={ROUTES.REGISTER}
              className={buttonVariants({
                variant: "default",
                size: "lg",
                className:
                  "h-12 rounded-none border-foreground bg-foreground px-6 font-mono text-xs uppercase tracking-[0.18em] text-background hover:bg-background hover:text-foreground",
              })}
            >
              {t("sign_up")}
              <ArrowRight className="size-5" />
            </Link>
          </motion.div>
          <motion.div variants={textReveal}>
            <Link
              href={ROUTES.LOGIN}
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className:
                  "h-12 rounded-none border-border bg-transparent px-6 font-mono text-xs uppercase tracking-[0.18em] hover:border-foreground",
              })}
            >
              {t("login")}
            </Link>
          </motion.div>
        </motion.div>

        <motion.dl
          variants={textStagger}
          className="mt-16 grid max-w-3xl grid-cols-3 divide-x divide-border border-y border-border"
        >
          {[
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
          ].map((metric) => (
            <motion.div
              key={metric.label}
              variants={textReveal}
              className="flex flex-col gap-2 px-4 py-5 sm:px-6 sm:py-6"
            >
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <metric.Icon
                  className="size-4 shrink-0"
                  aria-hidden="true"
                />
                <dt>{metric.label}</dt>
              </div>
              <dd className="font-mono text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {metric.value}
              </dd>
            </motion.div>
          ))}
        </motion.dl>
      </motion.div>
    </LazyMotion>
  );
}
