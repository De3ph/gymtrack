'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading, initializeAuth, user } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (!user) {
        // User is authenticated but user data is missing, reinitialize
        initializeAuth();
        return;
      }

      // Redirect based on user role
      if (user.role === 'trainer') {
        router.push('/trainer/clients');
      } else {
        router.push('/athlete/workouts');
      }
    }
  }, [isAuthenticated, isLoading, router, user, initializeAuth]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="flex flex-col items-center gap-8 px-8 py-16 text-center">
        <h1 className="text-6xl font-bold tracking-tight text-gray-900 dark:text-white">
          GymTrack
        </h1>
        <p className="max-w-2xl text-xl text-gray-600 dark:text-gray-300">
          The ultimate fitness tracking platform connecting trainers and athletes.
          Track workouts, monitor nutrition, and achieve your fitness goals together.
        </p>
        <div className="flex gap-4">
          <a
            href="/login"
            className="rounded-lg bg-indigo-600 px-8 py-3 text-lg font-semibold text-white shadow-lg transition-colors hover:bg-indigo-700"
          >
            Login
          </a>
          <a
            href="/register"
            className="rounded-lg border-2 border-indigo-600 px-8 py-3 text-lg font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 dark:border-indigo-400 dark:text-indigo-400 dark:hover:bg-gray-800"
          >
            Sign Up
          </a>
        </div>
      </main>
    </div>
  );
}
