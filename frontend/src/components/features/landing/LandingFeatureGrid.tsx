import { Apple, Dumbbell, Ruler, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import { landingCard, landingStagger } from "./landing-variants";

const featureKeys = [
  {
    icon: Dumbbell,
    titleKey: "features.workouts.title",
    descriptionKey: "features.workouts.description",
  },
  {
    icon: Apple,
    titleKey: "features.nutrition.title",
    descriptionKey: "features.nutrition.description",
  },
  {
    icon: Ruler,
    titleKey: "features.measurements.title",
    descriptionKey: "features.measurements.description",
  },
  {
    icon: Users,
    titleKey: "features.coaching.title",
    descriptionKey: "features.coaching.description",
  },
] as const;

export function LandingFeatureGrid() {
  const t = useTranslations("home");

  return (
    <LazyMotion features={domAnimation}>
      <motion.div
        className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        variants={landingStagger}
      >
        {featureKeys.map((feature, index) => (
          <motion.article
            key={feature.titleKey}
            className="group rounded-3xl border border-border bg-card/70 p-5 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
            variants={landingCard}
            style={{ transitionDelay: `${index * 70}ms` }}
          >
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <feature.icon className="size-5" />
            </div>
            <h3 className="mt-5 text-lg font-black">{t(feature.titleKey)}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {t(feature.descriptionKey)}
            </p>
          </motion.article>
        ))}
      </motion.div>
    </LazyMotion>
  );
}
