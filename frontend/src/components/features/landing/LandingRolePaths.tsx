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

      {roleKeys.map((role, index) => {
        const isAthlete = role === "athlete";
        return (
          <article
            key={role}
            className={cn(
              "group flex flex-col gap-6 px-6 py-8 transition-colors duration-200 sm:px-10 sm:py-12",
              "hover:bg-muted/20",
              index === 0 ? "border-b border-border lg:border-b-0" : "",
              isAthlete
                ? "hover:border-primary/20"
                : "hover:border-accent/20"
            )}
          >
            <header className="flex items-baseline gap-4">
              <span
                className={cn(
                  "font-mono text-3xl font-semibold transition-colors duration-200 sm:text-4xl",
                  isAthlete
                    ? "text-primary group-hover:text-primary"
                    : "text-accent group-hover:text-accent"
                )}
                aria-hidden="true"
              >
                {isAthlete ? "A." : "T."}
              </span>
              <p
                className={cn(
                  "font-mono text-[10px] uppercase tracking-[0.18em] transition-colors",
                  isAthlete
                    ? "text-primary/70 group-hover:text-primary"
                    : "text-accent-foreground/60 group-hover:text-accent"
                )}
              >
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
                  <span
                    className={cn(
                      "font-mono text-xs transition-colors",
                      isAthlete
                        ? "text-primary/60 group-hover:text-primary"
                        : "text-accent/70 group-hover:text-accent"
                    )}
                  >
                    0{i + 1}
                  </span>
                  <Check
                    className={cn(
                      "size-5 transition-colors",
                      isAthlete ? "text-primary" : "text-accent"
                    )}
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
                className: cn(
                  "w-fit rounded-none px-5 font-mono text-xs uppercase tracking-[0.18em] transition-colors",
                  isAthlete
                    ? "border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    : "border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                ),
              })}
            >
              {t("role_paths." + role + ".cta")}
              <ArrowUpRight className="size-5" aria-hidden="true" />
            </Link>
          </article>
        );
      })}
    </motion.div>
  );
}
