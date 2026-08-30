"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FullBleedBackdrop } from "@/components/features/landing/FullBleedBackdrop";
import { LandingHeader } from "@/components/features/landing/LandingHeader";
import { LandingHero } from "@/components/features/landing/landing-hero";
import { SectionRail } from "@/components/features/landing/SectionRail";
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
import { motion } from "motion/react";
import { useEffect, useState, Suspense } from "react";
import dynamic from "next/dynamic";

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

const LandingProof = dynamic(
  () => import("@/components/features/landing/LandingProof").then((m) => m.LandingProof),
  { ssr: false, loading: () => null }
);

const sections = [
  { index: "01", id: "hero" },
  { index: "02", id: "console" },
  { index: "03", id: "features" },
  { index: "04", id: "roles" },
  { index: "05", id: "proof" },
] as const;

/**
 * Inverted (dark) section surface. Scoped token overrides keep shadcn
 * utilities (bg-foreground, text-background, bg-muted, bg-primary, …)
 * readable on top of the dark band in both themes. Pair with
 * <FullBleedBackdrop /> to paint the band edge-to-edge.
 */
const invertedSection =
  "relative isolate text-[#fafaf9] [--accent:#2dd4bf] [--accent-foreground:#0c0a09] [--background:#0c0a09] [--border:#ffffff40] [--card:#1c1917] [--card-foreground:#fafaf9] [--destructive:#f87171] [--destructive-foreground:#0c0a09] [--foreground:#fafaf9] [--input:#292524] [--muted:#292524] [--muted-foreground:#a8a29e] [--popover:#1c1917] [--popover-foreground:#fafaf9] [--primary:#ef4444] [--primary-foreground:#fafaf9] [--ring:#ef4444] [--secondary:#292524] [--secondary-foreground:#fafaf9]";

export function LandingClient() {
  const t = useTranslations("dashboard");
  const [showAuthError, setShowAuthError] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") !== "auth_required") return;
    setShowAuthError(true);
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
    <div className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      <div className="mx-auto max-w-[88rem] px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-[auto_1fr] gap-x-8 lg:grid-cols-[6rem_1fr]">
          <aside
            aria-hidden="true"
            className="relative z-10 hidden border-r border-border text-white mix-blend-difference [--foreground:#fafaf9] [--muted-foreground:#a8a29e] lg:block"
          >
            <motion.div
              className="sticky top-0 flex h-screen flex-col justify-between py-8 font-mono text-[10px] uppercase tracking-[0.18em]"
              variants={textStaggerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.span variants={textVariants} className="-rotate-90 origin-top-left translate-x-6 translate-y-6">
                GymTrack / 2026
              </motion.span>
              <ul className="space-y-2">
                {sections.map((section, i) => (
                  <motion.li
                    key={section.id}
                    variants={textVariants}
                    transition={{ delay: 0.08 + i * 0.04 }}
                  >
                    <a
                      href={`#${section.id}`}
                      className="block transition-colors hover:text-foreground"
                    >
                      §{section.index}
                    </a>
                  </motion.li>
                ))}
              </ul>
              <motion.span
                variants={textVariants}
                transition={{ delay: 0.32 }}
                className="-rotate-90 origin-bottom-left translate-x-6 -translate-y-6"
              >
                Built for measurable progress
              </motion.span>
            </motion.div>
          </aside>

          <motion.main
            className="flex flex-col"
            variants={mainVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="py-6 sm:py-8">
              <LandingHeader />
            </div>

            {showAuthError && (
              <Alert
                variant="destructive"
                className="mb-6 border-destructive/40 bg-destructive/5 font-mono text-xs"
                aria-live="polite"
              >
                <Zap className="size-5" />
                <AlertTitle>{t("auth_required.title")}</AlertTitle>
                <AlertDescription>
                  {t("auth_required.description")}
                </AlertDescription>
              </Alert>
            )}

            <motion.section
              id="hero"
              className={`relative border-t border-border py-16 sm:py-24 lg:py-32 ${invertedSection}`}
              aria-labelledby="hero-heading"
              variants={sectionVariants}
            >
              <div
                aria-hidden="true"
                className="absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2 bg-[#0c0a09] lg:-translate-x-[calc(50%_+_4rem)]"
              >
                <Image
                  src="/images/hero-training.jpg"
                  alt=""
                  fill
                  priority
                  className="object-cover brightness-50 contrast-125 grayscale"
                  sizes="100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/70" />
              </div>
              <SectionRail index="01" label="Mission control" />
              <LandingHero />
            </motion.section>

            <motion.section
              id="console"
              className="border-t border-border py-16 sm:py-24 lg:py-32"
              aria-labelledby="console-heading"
              variants={sectionVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
            >
              <SectionRail index="02" label="Live signal" />
              <Suspense fallback={null}>
                <LandingConsole />
              </Suspense>
            </motion.section>

            <motion.section
              id="features"
              className={`border-t border-border py-16 sm:py-24 lg:py-32 ${invertedSection}`}
              aria-labelledby="features-heading"
              variants={sectionVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
            >
              <FullBleedBackdrop />
              <SectionRail index="03" label="What you log" />
              <Suspense fallback={null}>
                <LandingFeatureGrid />
              </Suspense>
            </motion.section>

            <motion.section
              id="roles"
              className="border-t border-border py-16 sm:py-24 lg:py-32"
              aria-labelledby="roles-heading"
              variants={sectionVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
            >
              <SectionRail index="04" label="Two sides, one loop" />
              <Suspense fallback={null}>
                <LandingRolePaths />
              </Suspense>
            </motion.section>

            <motion.section
              id="proof"
              className={`border-t border-border py-16 sm:py-24 lg:py-32 ${invertedSection}`}
              aria-labelledby="proof-heading"
              variants={sectionVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
            >
              <FullBleedBackdrop />
              <SectionRail index="05" label="Outcome" />
              <Suspense fallback={null}>
                <LandingProof />
              </Suspense>
            </motion.section>

            <motion.footer
              variants={textVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className={`border-t border-border py-8 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground ${invertedSection}`}
            >
              <FullBleedBackdrop />
              <motion.div
                variants={textStaggerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="flex flex-wrap items-center justify-between gap-4"
              >
                <motion.span variants={textVariants}>© GymTrack</motion.span>
                <motion.span variants={textVariants}>EN / TR</motion.span>
              </motion.div>
            </motion.footer>
          </motion.main>
        </div>
      </div>
    </div>
  );
}
