import { ArrowUpRight, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/routes";
import { buttonVariants } from "@/components/ui/button";
import { motion } from "motion/react";
import { landingReveal } from "./landing-variants";

const roleKeys = ["athlete", "trainer"] as const;

export function LandingRolePaths() {
  const t = useTranslations("home");

  return (
    <motion.div
      variants={landingReveal}
      className="grid grid-cols-1 border border-border lg:grid-cols-2 lg:divide-x lg:divide-border"
      role="region"
      aria-labelledby="roles-heading"
    >
      <h2 id="roles-heading" className="sr-only">
        Two sides, one loop
      </h2>

      {roleKeys.map((role, index) => (
        <article
          key={role}
          className={[
            "flex flex-col gap-6 px-6 py-8 sm:px-10 sm:py-12",
            index === 0 ? "border-b border-border lg:border-b-0" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <header className="flex items-baseline gap-4">
            <span
              className="font-mono text-3xl font-normal text-foreground sm:text-4xl"
              aria-hidden="true"
            >
              {role === "athlete" ? "A." : "T."}
            </span>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {t("role_paths." + role + ".kicker")}
            </p>
          </header>

          <h3 className="text-balance font-mono text-2xl font-normal leading-tight tracking-[-0.03em] text-foreground sm:text-3xl">
            {t("role_paths." + role + ".title")}
          </h3>

          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            {t("role_paths." + role + ".description")}
          </p>

          <ol className="divide-y divide-border border-y border-border">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="grid grid-cols-[2rem_1.25rem_1fr] items-center gap-3 py-3 text-foreground"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  0{i + 1}
                </span>
                <Check
                  className="size-3.5 text-foreground"
                  aria-hidden="true"
                />
                <span className="text-sm">
                  {t("role_paths." + role + ".bullets." + i)}
                </span>
              </li>
            ))}
          </ol>

          <Link
            href={ROUTES.REGISTER}
            className={buttonVariants({
              variant: "outline",
              size: "lg",
              className:
                "w-fit rounded-none border-foreground px-5 font-mono text-xs uppercase tracking-[0.18em] text-foreground hover:bg-foreground hover:text-background",
            })}
          >
            {t("role_paths." + role + ".cta")}
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </article>
      ))}
    </motion.div>
  );
}
