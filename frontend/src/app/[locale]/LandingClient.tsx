"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { LandingConsole } from "@/components/features/landing/LandingConsole";
import { LandingFeatureGrid } from "@/components/features/landing/LandingFeatureGrid";
import { LandingHeader } from "@/components/features/landing/LandingHeader";
import { LandingHero } from "@/components/features/landing/LandingHero";
import { LandingProof } from "@/components/features/landing/LandingProof";
import { LandingRolePaths } from "@/components/features/landing/LandingRolePaths";
import {
  landingStagger,
  landingReveal,
  textReveal,
  textStagger,
} from "@/components/features/landing/landing-variants";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Zap } from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";

const sections = [
  { index: "01", id: "hero" },
  { index: "02", id: "console" },
  { index: "03", id: "features" },
  { index: "04", id: "roles" },
  { index: "05", id: "proof" },
] as const;

export function LandingClient() {
  const searchParams = useSearchParams();
  const t = useTranslations("dashboard");
  const showAuthError = searchParams.get("error") === "auth_required";

  useEffect(() => {
    if (showAuthError && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState(null, "", url.toString());
    }
  }, [showAuthError]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[88rem] px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-[auto_1fr] gap-x-8 lg:grid-cols-[6rem_1fr]">
          <aside
            aria-hidden="true"
            className="hidden border-r border-border lg:block"
          >
            <motion.div
              className="sticky top-0 flex h-screen flex-col justify-between py-8 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
              variants={textStagger}
              initial="hidden"
              animate="visible"
            >
              <motion.span variants={textReveal} className="-rotate-90 origin-top-left translate-x-6 translate-y-6">
                GymTrack / 2026
              </motion.span>
              <ul className="space-y-2">
                {sections.map((section, i) => (
                  <motion.li
                    key={section.id}
                    variants={textReveal}
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
                variants={textReveal}
                transition={{ delay: 0.32 }}
                className="-rotate-90 origin-bottom-left translate-x-6 -translate-y-6"
              >
                Built for measurable progress
              </motion.span>
            </motion.div>
          </aside>

          <motion.main
            className="flex flex-col"
            variants={landingStagger}
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
              className="border-t border-border py-16 sm:py-24 lg:py-32"
              aria-labelledby="hero-heading"
              variants={landingReveal}
            >
              <SectionRail index="01" label="Mission control" />
              <LandingHero />
            </motion.section>

            <motion.section
              id="console"
              className="border-t border-border py-16 sm:py-24 lg:py-32"
              aria-labelledby="console-heading"
              variants={landingReveal}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
            >
              <SectionRail index="02" label="Live signal" />
              <LandingConsole />
            </motion.section>

            <motion.section
              id="features"
              className="border-t border-border py-16 sm:py-24 lg:py-32"
              aria-labelledby="features-heading"
              variants={landingReveal}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
            >
              <SectionRail index="03" label="What you log" />
              <LandingFeatureGrid />
            </motion.section>

            <motion.section
              id="roles"
              className="border-t border-border py-16 sm:py-24 lg:py-32"
              aria-labelledby="roles-heading"
              variants={landingReveal}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
            >
              <SectionRail index="04" label="Two sides, one loop" />
              <LandingRolePaths />
            </motion.section>

            <motion.section
              id="proof"
              className="border-t border-border py-16 sm:py-24 lg:py-32"
              aria-labelledby="proof-heading"
              variants={landingReveal}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
            >
              <SectionRail index="05" label="Outcome" />
              <LandingProof />
            </motion.section>

            <motion.footer
              variants={textReveal}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="border-t border-border py-8 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
            >
              <motion.div
                variants={textStagger}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="flex flex-wrap items-center justify-between gap-4"
              >
                <motion.span variants={textReveal}>© GymTrack</motion.span>
                <motion.span variants={textReveal}>EN / TR</motion.span>
              </motion.div>
            </motion.footer>
          </motion.main>
        </div>
      </div>
    </div>
  );
}

function SectionRail({ index, label }: { index: string; label: string }) {
  return (
    <motion.div
      variants={textStagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      className="mb-10 flex items-baseline gap-6 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
    >
      <motion.span variants={textReveal} className="text-foreground">
        §{index}
      </motion.span>
      <motion.span variants={textReveal}>{label}</motion.span>
      <motion.div variants={textReveal} className="flex-1">
        <Separator className="flex-1" />
      </motion.div>
    </motion.div>
  );
}
