import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { NoiseBackground } from "@/components/ui/noise-background";
import { motion } from "motion/react";
import {
  reducedMotionVariants,
  textReveal,
  textStagger,
} from "../landing-variants";
import { useReducedMotion } from "../useReducedMotion";

export function HeroActions() {
  const t = useTranslations("home");
  const reducedMotion = useReducedMotion();
  const staggerVariants = reducedMotion ? reducedMotionVariants : textStagger;
  const revealVariants = reducedMotion ? reducedMotionVariants : textReveal;

  return (
    <motion.div
      variants={staggerVariants}
      className="mt-12 flex flex-col gap-3 sm:flex-row sm:items-center"
    >
      <motion.div variants={revealVariants} className="w-full sm:w-auto">
        <NoiseBackground
          padding="p-px"
          radius="rounded-none"
          gradientColors={[
            "var(--red-500)",
            "var(--amber-500)",
            "var(--teal-500)",
          ]}
          containerClassName="w-full sm:w-fit"
        >
          <Link
            href={ROUTES.REGISTER}
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "h-12 w-full rounded-none border-foreground bg-foreground px-6 text-3xl font-medium text-background hover:bg-background hover:text-foreground sm:w-auto",
            )}
          >
            {t("sign_up")}
            <ArrowRight className="size-7" aria-hidden="true" />
          </Link>
        </NoiseBackground>
      </motion.div>
      <motion.div variants={revealVariants} className="w-full sm:w-auto">
        <NoiseBackground
          padding="p-px"
          radius="rounded-none"
          gradientColors={[
            "var(--red-500)",
            "var(--amber-500)",
            "var(--teal-500)",
          ]}
          containerClassName="w-full sm:w-fit"
        >
          <Link
            href={ROUTES.LOGIN}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-12 w-full rounded-none border-transparent bg-background px-6 text-3xl font-medium text-foreground hover:bg-foreground hover:text-background dark:border-transparent dark:bg-background dark:hover:bg-foreground sm:w-auto",
            )}
          >
            {t("login")}
          </Link>
        </NoiseBackground>
      </motion.div>
    </motion.div>
  );
}