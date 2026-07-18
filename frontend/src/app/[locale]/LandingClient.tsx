"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LandingConsole } from "@/components/features/landing/LandingConsole";
import { LandingFeatureGrid } from "@/components/features/landing/LandingFeatureGrid";
import { LandingHeader } from "@/components/features/landing/LandingHeader";
import { LandingHero } from "@/components/features/landing/LandingHero";
import { LandingProof } from "@/components/features/landing/LandingProof";
import { LandingRolePaths } from "@/components/features/landing/LandingRolePaths";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
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
        <div className="absolute left-1/2 top-[-18rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute bottom-[-20rem] right-[-10rem] h-[32rem] w-[32rem] rounded-full bg-accent/8 blur-3xl" />
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
          {/* Hero section: text + image side by side */}
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
            <LandingHero />
            {/* Hero image column — larger grid column */}
            <div className="hidden lg:block">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80"
                alt="Modern gym training facility with equipment"
                aspectRatio="4/3"
                className="rounded-2xl shadow-lg shadow-black/10"
                priority
              />
            </div>
          </div>

          {/* Mobile: hero image below text + CTA, above sections */}
          <div className="mt-8 lg:hidden">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80"
              alt="Modern gym training facility with equipment"
              aspectRatio="4/3"
              className="rounded-2xl shadow-lg shadow-black/10"
            />
          </div>

          <div className="mt-24">
            <LandingFeatureGrid />
          </div>

          <div className="mt-24">
            <LandingRolePaths />
          </div>

          <div className="mt-24">
            <LandingProof />
          </div>

          {/* LandingConsole moved to bottom of page */}
          <div className="mt-24">
            <LandingConsole />
          </div>
        </motion.main>
      </div>
    </section>
  );
}
