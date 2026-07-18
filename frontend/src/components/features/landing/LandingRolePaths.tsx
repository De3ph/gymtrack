import { ArrowRight, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/routes";
import { motion, LazyMotion, domAnimation } from "motion/react";
import { landingCard, landingStagger } from "./landing-variants";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";

const roleKeys = ["athlete", "trainer"] as const;

const roleImages: Record<string, { src: string; alt: string }> = {
  athlete: {
    src: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80",
    alt: "Athlete training with weights",
  },
  trainer: {
    src: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80",
    alt: "Trainer coaching a client",
  },
};

export function LandingRolePaths() {
  const t = useTranslations("home");

  return (
    <motion.div
      className="mt-4 grid gap-4 lg:grid-cols-2"
      variants={landingStagger}
    >
      {roleKeys.map((role) => (
        <motion.article
          key={role}
          className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-8"
          variants={landingCard}
        >
          <div className="absolute right-[-4rem] top-[-4rem] size-32 rounded-full bg-accent/10 blur-2xl" />
          <div className="absolute right-2 top-2 w-36 overflow-hidden rounded-xl shadow-lg sm:w-40">
            <ImageWithFallback
              src={roleImages[role].src}
              alt={roleImages[role].alt}
              aspectRatio="4/3"
              className="rounded-xl"
            />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-accent">
            {t("role_paths."+role+".kicker")}
          </p>
          <h3 className="mt-4 text-3xl font-black tracking-tight">
            {t("role_paths."+role+".title")}
          </h3>
          <p className="mt-4 max-w-xl text-muted-foreground">
            {t("role_paths."+role+".description")}
          </p>
          <ul className="mt-6 space-y-3">
            {[0, 1, 2].map((index) => (
              <li key={index} className="flex gap-3 text-sm">
                <TrendingUp className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{t("role_paths."+role+".bullets."+index)}</span>
              </li>
            ))}
          </ul>
          <Link
            href={ROUTES.REGISTER}
            className="mt-8 inline-flex items-center gap-2 rounded-lg border border-border px-5 py-3 text-sm font-black transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {t("role_paths."+role+".cta")}
            <ArrowRight className="size-4" />
          </Link>
        </motion.article>
      ))}
    </motion.div>
  );
}
