"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/authStore";
import { motion } from "motion/react";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { ROUTES } from "@/lib/routes";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LocaleToggle } from "@/components/layout/locale-toggle";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading, initializeAuth, user, isInitialized } =
    useAuthStore();
  const t = useTranslations("home");

  useEffect(() => {
    // Initialize auth if not already done
    if (!isInitialized) {
      initializeAuth();
    }
  }, [initializeAuth, isInitialized]);

  useEffect(() => {
    // Only redirect if fully loaded and authenticated
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="fixed right-4 top-4 z-50 flex items-center gap-1">
        <ThemeToggle />
        <LocaleToggle />
      </div>
      <motion.main
        className="flex flex-col items-center gap-8 px-8 py-16 text-center"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.h1
          className="text-6xl font-bold tracking-tight text-foreground"
          variants={staggerItem}
        >
          {t("title")}
        </motion.h1>
        <motion.p
          className="max-w-2xl text-xl text-muted-foreground"
          variants={staggerItem}
        >
          {t("description")}
        </motion.p>
        <motion.div className="flex gap-4" variants={staggerItem}>
          <motion.div whileHover={{ opacity: 0.9 }} whileTap={{ opacity: 0.8 }}>
            <Link
              href={ROUTES.REGISTER}
              className="rounded-lg border-2 border-border px-8 py-3 text-lg font-semibold text-foreground transition-colors hover:bg-muted"
            >
              {t("sign_up")}
            </Link>
          </motion.div>
          <motion.div whileHover={{ opacity: 0.9 }} whileTap={{ opacity: 0.8 }}>
            <Link
              href={ROUTES.LOGIN}
              className="rounded-lg bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
            >
              {t("login")}
            </Link>
          </motion.div>
        </motion.div>
      </motion.main>
    </div>
  );
}
