import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { memo } from "react";
import { featureGridItemVariants, reducedMotionVariants } from "./landing-variants";
import { useReducedMotion } from "./useReducedMotion";

interface Example {
  label: string;
  title: string;
  subtitle: string;
  extras: string[];
}

interface FeatureGridItemProps {
  icon: React.ComponentType<{ className?: string; ariaHidden?: string }>;
  titleKey: string;
  descriptionKey: string;
  metricKey: string;
  example: Example;
  badge: string;
}

const FeatureGridItem = memo(function FeatureGridItem({ icon: Icon, titleKey, descriptionKey, metricKey, example, badge }: FeatureGridItemProps) {
  const t = useTranslations("home");
  const reducedMotion = useReducedMotion();
  const variants = reducedMotion ? reducedMotionVariants : featureGridItemVariants;

  return (
    <motion.li
      variants={variants}
      initial="hidden"
      animate="visible"
      className="px-8 py-10 transition-colors hover:bg-muted/20"
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0 -200px" }}
      style={{ contentVisibility: "auto" }}
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-start">
        <div className="flex items-start gap-6">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50">
            <Icon className="size-5 text-foreground" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {t(titleKey)}
            </h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              {t(descriptionKey)}
            </p>
            <div className="mt-6 flex items-center gap-4">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {t("features.output")}
                </span>
                <p className="mt-1 font-mono text-sm font-medium text-foreground">
                  {t(metricKey)}
                </p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="flex items-center gap-2 text-muted-foreground">
                {/* Conditional stats rendered by the caller */}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-border bg-muted/30 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {example.label}
              </span>
            </div>
            <Badge
              variant="outline"
              className="rounded-none border-border bg-background px-2 py-0 font-mono text-[10px] uppercase tracking-wider"
            >
              {badge}
            </Badge>
          </div>

          <div className="mt-4 space-y-1">
            <p className="font-semibold text-foreground">{example.title}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {example.subtitle}
            </p>
          </div>

          <div className="mt-4 space-y-1.5">
            {example.extras.map((extra, i) => (
              <div key={`extra-${i}-${extra}`} className="flex items-center gap-2">
                <span className="size-1 rounded-full bg-muted-foreground/40" />
                <span className="text-xs text-muted-foreground">{extra}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.li>
  );
});

FeatureGridItem.displayName = "FeatureGridItem";

export { FeatureGridItem };