"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LandingConsole } from "@/components/features/landing/LandingConsole";
import { LandingFeatureGrid } from "@/components/features/landing/LandingFeatureGrid";
import { LandingHeader } from "@/components/features/landing/LandingHeader";
import { LandingHero } from "@/components/features/landing/LandingHero";
import { LandingProof } from "@/components/features/landing/LandingProof";
import { LandingRolePaths } from "@/components/features/landing/LandingRolePaths";
import { landingStagger } from "@/components/features/landing/landing-variants";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Zap } from "lucide-react";
import { motion } from "motion/react";

export function LandingClient() {
  const searchParams = useSearchParams();
  const t = useTranslations("dashboard");
  const showAuthError = searchParams.get("error") === "auth_required";

  return (
    <section className="relative isolate min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-18rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-[-20rem] right-[-10rem] h-[32rem] w-[32rem] rounded-full bg-accent/15 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4.5rem_4.5rem] opacity-[0.18]" />
      </div>

      <div className="container relative mx-auto flex min-h-screen flex-col px-4 py-5 sm:px-6 lg:px-8">
        <LandingHeader />

        {showAuthError && (
          <Alert variant="destructive" className="mx-auto max-w-xl" aria-live="polite">
            <Zap className="size-4" />
            <AlertTitle>{t("auth_required.title")}</AlertTitle>
            <AlertDescription>{t("auth_required.description")}</AlertDescription>
          </Alert>
        )}

        <motion.main
          className="flex flex-1 flex-col justify-center py-12 lg:py-8"
          variants={landingStagger}
          initial="hidden"
          animate="visible"
        >
          <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
            <LandingHero />
            <LandingConsole />
          </div>

          <LandingFeatureGrid />
          <LandingRolePaths />
          <LandingProof />
        </motion.main>
      </div>
    </section>
  );
}
