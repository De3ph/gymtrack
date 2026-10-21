"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FullBleedBackdrop } from "@/components/features/landing/FullBleedBackdrop";
import { LandingHeader } from "@/components/features/landing/LandingHeader";
import { LandingHero } from "@/components/features/landing/landing-hero";
import { useReducedMotion } from "@/components/features/landing/useReducedMotion";
import {
  landingStagger,
  landingReveal,
  reducedMotionVariants,
  textReveal,
  textStagger,
} from "@/components/features/landing/landing-variants";
import { useTranslations } from "next-intl";
import { Zap } from "lucide-react";
import Image from "next/image";
import * as m from "motion/react-m";
import { useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { MotionProvider } from "@/components/ui/motion-provider";

const LandingConsole = dynamic(
  () => import("@/components/features/landing/LandingConsole").then((m) => m.LandingConsole),
  { ssr: false, loading: () => null }
);

const LandingFeatureGrid = dynamic(
  () => import("@/components/features/landing/LandingFeatureGrid").then((m) => m.LandingFeatureGrid),
  { ssr: false, loading: () => null }
);

const LandingRolePaths = dynamic(
  () => import("@/components/features/landing/LandingRolePaths").then((m) => m.LandingRolePaths),
  { ssr: false, loading: () => null }
);

/**
 * Inverted (dark) section surface. `.surface-inverted` re-points the
 * semantic tokens at the dark end of the palette, so the shadcn utilities
 * (bg-foreground, text-background, bg-muted, bg-primary, …) stay readable
 * on top of the dark band in both themes — and follow the palette when it
 * changes. Pair with <FullBleedBackdrop /> to paint the band edge-to-edge.
 */
const invertedSection = "surface-inverted isolate text-foreground";

export function LandingClient({ authError = false }: { authError?: boolean }) {
  const t = useTranslations("dashboard");
  const reducedMotion = useReducedMotion();

  // Drop the ?error=auth_required marker from the URL once it has been
  // rendered, so a refresh does not re-show the alert. The alert itself is
  // driven by the server-resolved searchParam (no state needed).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") !== "auth_required") return;
    params.delete("error");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${qs ? `?${qs}` : ""}`
    );
  }, []);

  const mainVariants = reducedMotion ? reducedMotionVariants : landingStagger;
  const sectionVariants = reducedMotion ? reducedMotionVariants : landingReveal;
  const textVariants = reducedMotion ? reducedMotionVariants : textReveal;
  const textStaggerVariants = reducedMotion ? reducedMotionVariants : textStagger;

  return (
    // MotionProvider: the landing page animates with the lazy `m` build,
    // which needs a LazyMotion ancestor to pick up its features.
    <MotionProvider>
      <div className="relative min-h-screen overflow-x-clip bg-background text-foreground">
        <div className="mx-auto max-w-[88rem] px-6 sm:px-8 lg:px-12">
          <div>
            <m.main
              className="flex flex-col"
              variants={mainVariants}
              initial="hidden"
              animate="visible"
            >
              <div className="py-6 sm:py-8">
                <LandingHeader />
              </div>

              {authError && (
                <Alert
                  variant="destructive"
                  className="mb-6 border-destructive/40 bg-destructive/5"
                  aria-live="polite"
                >
                  <Zap className="size-5" />
                  <AlertTitle>{t("auth_required.title")}</AlertTitle>
                  <AlertDescription>
                    {t("auth_required.description")}
                  </AlertDescription>
                </Alert>
              )}

              <m.section
                id="hero"
                className={`relative border-t border-border py-16 sm:py-24 lg:py-32 ${invertedSection}`}
                aria-labelledby="hero-heading"
                variants={sectionVariants}
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2 bg-background"
                >
                  <Image
                    src="/images/hero-training.jpg"
                    alt=""
                    fill
                    priority
                    fetchPriority="high"
                    className="object-cover brightness-50 contrast-125 grayscale"
                    sizes="100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/75" />
                </div>
                <LandingHero />
              </m.section>

              <m.section
                id="console"
                className="border-t border-border bg-stone-100 py-16 sm:py-24 lg:py-32 dark:bg-stone-950"
                aria-labelledby="console-heading"
                variants={sectionVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
              >
                <Suspense fallback={null}>
                  <LandingConsole />
                </Suspense>
              </m.section>

              <m.section
                id="features"
                className={`relative border-t border-border py-16 sm:py-24 lg:py-32 ${invertedSection}`}
                aria-labelledby="features-heading"
                variants={sectionVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
              >
                <FullBleedBackdrop />
                <Suspense fallback={null}>
                  <LandingFeatureGrid />
                </Suspense>
              </m.section>

              <m.section
                id="roles"
                className="border-t border-border py-16 sm:py-24 lg:py-32"
                aria-labelledby="roles-heading"
                variants={sectionVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
              >
                <Suspense fallback={null}>
                  <LandingRolePaths />
                </Suspense>
              </m.section>

              <m.footer
                variants={textVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className={`relative border-t border-border py-8 text-sm font-medium text-muted-foreground ${invertedSection}`}
              >
                <FullBleedBackdrop />
                <m.div
                  variants={textStaggerVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="flex flex-wrap items-center justify-between gap-4"
                >
                  <m.span variants={textVariants}>© GymTrack</m.span>
                  <m.span variants={textVariants}>EN / TR</m.span>
                </m.div>
              </m.footer>
            </m.main>
          </div>
        </div>
      </div>
    </MotionProvider>
  );
}
