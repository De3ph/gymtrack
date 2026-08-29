import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/routes";
import { buttonVariants } from "@/components/ui/button";
import { motion } from "motion/react";
import { textReveal, textStagger } from "../landing-variants";

export function HeroActions() {
  const t = useTranslations("home");

  return (
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
  );
}