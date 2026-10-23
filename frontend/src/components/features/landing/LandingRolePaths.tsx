import { ArrowUpRight, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/routes";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import * as m from "motion/react-m";
import { landingReveal, reducedMotionVariants, revealOnView } from "./landing-variants";
import { useReducedMotion } from "./useReducedMotion";

const roleKeys = ["athlete", "trainer"] as const;

export function LandingRolePaths() {
  const t = useTranslations("home");
  const reducedMotion = useReducedMotion();
  const variants = reducedMotion ? reducedMotionVariants : landingReveal;

  return (
    <m.div
      variants={variants}
      {...revealOnView}
      className="grid grid-cols-1 items-stretch border border-border lg:grid-cols-2"
      role="region"
      aria-labelledby="roles-heading"
    >
      <h2
        id="roles-heading"
        className="col-span-full border-b border-border px-8 py-6 text-4xl font-medium text-foreground sm:px-12 sm:py-8"
      >
        {t("role_paths.heading")}
      </h2>

      {roleKeys.map((role, index) => (
        <article
          key={role}
          className={cn(
            "group flex h-full flex-col gap-6 px-8 py-10 transition-colors duration-200 sm:px-12 sm:py-14",
            "hover:bg-muted/20 hover:border-primary/20",
            index === 0
              ? "border-b border-border lg:border-b-0"
              : "lg:border-l lg:border-border"
          )}
        >
          <div className="min-h-12 px-2">
            <header className="flex items-baseline gap-4">
              <span
                className="text-4xl font-medium text-primary transition-colors duration-200 group-hover:text-primary"
                aria-hidden="true"
              >
                {role === "athlete" ? "A." : "T."}
              </span>
            </header>

            <h3 className="mt-4 text-balance text-3xl font-medium text-foreground transition-colors group-hover:text-foreground">
              {t(`role_paths.${role}.title`)}
            </h3>
          </div>

          <div className="flex-1 px-2">
            <p className="max-w-md text-pretty text-2xl text-muted-foreground transition-colors group-hover:text-foreground/80 mb-4">
              {t(`role_paths.${role}.description`)}
            </p>

            <ol className="divide-y divide-border border-y border-border">
              {[0, 1, 2].map((i) => (
                <li
                  key={`bullet-${role}-${i}`}
                  className="grid grid-cols-[2rem_1.5rem_1fr] items-center gap-3 py-4 px-1.5 text-foreground transition-colors hover:bg-muted/30"
                >
                  <span className="text-sm font-medium tabular-nums text-primary transition-colors group-hover:text-primary">
                    0{i + 1}
                  </span>
                  <Check
                    className="size-6 text-primary transition-colors"
                    aria-hidden="true"
                  />
                  <span className="text-2xl transition-colors group-hover:text-foreground">
                    {t(`role_paths.${role}.bullets.${i}`)}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <Link
            href={ROUTES.REGISTER}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "w-fit rounded-none border-primary px-6 text-2xl font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            )}
          >
            {t(`role_paths.${role}.cta`)}
            <ArrowUpRight className="size-6" aria-hidden="true" />
          </Link>
        </article>
      ))}
    </m.div>
  );
}
