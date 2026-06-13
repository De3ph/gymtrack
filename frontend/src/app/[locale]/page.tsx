"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/authStore";
import { motion } from "motion/react";
import { ROUTES } from "@/lib/routes";
import { Zap } from "lucide-react";
import { landingStagger } from "@/components/features/landing/landing-variants";
import { LandingConsole } from "@/components/features/landing/LandingConsole";
import { LandingFeatureGrid } from "@/components/features/landing/LandingFeatureGrid";
import { LandingHeader } from "@/components/features/landing/LandingHeader";
import { LandingHero } from "@/components/features/landing/LandingHero";
import { LandingProof } from "@/components/features/landing/LandingProof";
import { LandingRolePaths } from "@/components/features/landing/LandingRolePaths";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading, initializeAuth, user, isInitialized } =
    useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      initializeAuth();
    }
  }, [initializeAuth, isInitialized]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === "trainer") {
        router.push(ROUTES.TRAINER_CLIENTS);
      } else {
        router.push(ROUTES.ATHLETE_WORKOUTS);
      }
    }
  }, [isAuthenticated, isLoading, router, user]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-lg text-muted-foreground">
          <Zap className="size-5 text-primary" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <section className="relative isolate min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-18rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-[-20rem] right-[-10rem] h-[32rem] w-[32rem] rounded-full bg-accent/15 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4.5rem_4.5rem] opacity-[0.18]" />
      </div>

      <div className="container relative mx-auto flex min-h-screen flex-col px-4 py-5 sm:px-6 lg:px-8">
        <LandingHeader />

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
