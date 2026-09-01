import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/routes";
import { buttonVariants } from "@/components/ui/button";
import { motion } from "motion/react";
import {
  reducedMotionVariants,
  textReveal,
  textStagger,
} from "../landing-variants";
import { useReducedMotion } from "../useReducedMotion";
import {
  RippleButton,
  RippleButtonRipples,
} from "@/components/animate-ui/components/buttons/ripple";

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
      <motion.div variants={revealVariants}>
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
      <motion.div variants={revealVariants}>
        <Link href={ROUTES.LOGIN}>
          <RippleButton
            className={buttonVariants({
              variant: "default",
              size: "lg",
              className:
                "h-12 rounded-none border-foreground bg-foreground px-6 font-mono text-xs uppercase tracking-[0.18em] text-background hover:bg-background hover:text-foreground",
            })}
          >
            {t("login")}
            <RippleButtonRipples color="red" />
          </RippleButton>
        </Link>
      </motion.div>
    </motion.div>
  );
}
