"use client";

import { useTranslations } from "next-intl";
import {
  LandingFeatureExample,
  type FeatureExample,
} from "./LandingFeatureExample";
import type { LandingFeature } from "./landing-features";

interface LandingFeatureItemProps {
  feature: LandingFeature;
}

function resolveExample(
  t: (key: string) => string,
  exampleKey: string,
): FeatureExample {
  return {
    label: t(`${exampleKey}.label`),
    badge: t(`${exampleKey}.badge`),
    title: t(`${exampleKey}.title`),
    subtitle: t(`${exampleKey}.subtitle`),
    extras: [t(`${exampleKey}.extra1`), t(`${exampleKey}.extra2`)],
  };
}

export function LandingFeatureItem({ feature }: LandingFeatureItemProps) {
  const t = useTranslations("home");
  const Icon = feature.icon;
  const StatIcon = feature.statIcon;

  return (
    <li
      className="px-8 py-10 transition-colors hover:bg-muted/20"
      style={{ contentVisibility: "auto" }}
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-start">
        <div className="flex items-start gap-6">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50">
            <Icon className="size-5 text-foreground" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {t(feature.titleKey)}
            </h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              {t(feature.descriptionKey)}
            </p>
            <div className="mt-6 flex items-center gap-2 text-muted-foreground">
              <StatIcon className="size-4" aria-hidden="true" />
              <span className="text-xs">{t(feature.statKey)}</span>
            </div>
          </div>
        </div>

        <LandingFeatureExample
          icon={feature.icon}
          example={resolveExample(t, feature.exampleKey)}
        />
      </div>
    </li>
  );
}
