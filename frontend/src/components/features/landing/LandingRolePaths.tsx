import { ArrowUpRight, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/routes";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
          className={cn(
            "group flex flex-col gap-6 px-6 py-8 transition-colors duration-200 sm:px-10 sm:py-12",
            "hover:bg-muted/20 hover:border-primary/20",
            index === 0 ? "border-b border-border lg:border-b-0" : ""
          )}
        >
          <header className="flex items-baseline gap-4">
            <span
              className="font-mono text-3xl font-semibold text-primary transition-colors duration-200 group-hover:text-primary sm:text-4xl"
              aria-hidden="true"
            >
              {role === "athlete" ? "A." : "T."}
            </span>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary/70 transition-colors group-hover:text-primary">
              {t("role_paths." + role + ".kicker")}
            </p>
          </header>

            <h3 className="text-balance font-mono text-2xl font-semibold leading-tight tracking-[-0.03em] text-foreground transition-colors group-hover:text-foreground sm:text-3xl">
              {t("role_paths." + role + ".title")}
            </h3>

            <p className="max-w-md text-sm font-semibold leading-6 text-muted-foreground transition-colors group-hover:text-foreground/80">
              {t("role_paths." + role + ".description")}
            </p>

            <ol className="divide-y divide-border border-y border-border">
              {[0, 1, 2].map((i) => (
                <li
                  key={i}
                  className="grid grid-cols-[2rem_1.25rem_1fr] items-center gap-3 py-3 text-foreground transition-colors hover:bg-muted/30"
                >
                  <span className="font-mono text-xs text-primary/60 transition-colors group-hover:text-primary">
                    0{i + 1}
                  </span>
                  <Check
                    className="size-5 text-primary transition-colors"
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium transition-colors group-hover:text-foreground">
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
                  "w-fit rounded-none border-primary px-5 font-mono text-xs uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground",
              })}
            >
              {t("role_paths." + role + ".cta")}
              <ArrowUpRight className="size-5" aria-hidden="true" />
            </Link>
          </article>
        )
      )}
    </motion.div>
  );
}
