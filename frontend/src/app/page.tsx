'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { motion } from 'motion/react';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations';
import { ROUTES } from '@/lib/routes';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading, initializeAuth, user, isInitialized } = useAuthStore();

  useEffect(() => {
    // Initialize auth if not already done
    if (!isInitialized) {
      initializeAuth();
    }
  }, [initializeAuth, isInitialized]);

  useEffect(() => {
    // Only redirect if fully loaded and authenticated
    if (!isLoading && isAuthenticated && user) {
      if (user.role === 'trainer') {
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <motion.main
        className="flex flex-col items-center gap-8 px-8 py-16 text-center"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.h1
          className="text-6xl font-bold tracking-tight text-gray-900 dark:text-white"
          variants={staggerItem}
        >
          GymTrack
        </motion.h1>
        <motion.p
          className="max-w-2xl text-xl text-gray-600 dark:text-gray-300"
          variants={staggerItem}
        >
          The ultimate fitness tracking platform connecting trainers and athletes.
          Track workouts, monitor nutrition, and achieve your fitness goals together.
        </motion.p>
        <motion.div
          className="flex gap-4"
          variants={staggerItem}
        >
          <motion.a
            href={ROUTES.LOGIN}
            className="rounded-lg bg-indigo-600 px-8 py-3 text-lg font-semibold text-white shadow-lg transition-colors hover:bg-indigo-700"
            whileHover={{ opacity: 0.9 }}
            whileTap={{ opacity: 0.8 }}
          >
            Login
          </motion.a>
          <motion.a
            href={ROUTES.REGISTER}
            className="rounded-lg border-2 border-indigo-600 px-8 py-3 text-lg font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 dark:border-indigo-400 dark:text-indigo-400 dark:hover:bg-gray-800"
            whileHover={{ opacity: 0.9 }}
            whileTap={{ opacity: 0.8 }}
          >
            Sign Up
          </motion.a>
        </motion.div>
      </motion.main>
    </div>
  );
}
