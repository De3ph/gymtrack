'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Loader2 } from 'lucide-react';
import { ROUTES } from '@/lib/routes';

export default function DashboardHomePage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(ROUTES.LOGIN);
      } else if (user) {
        // Redirect based on user role
        if (user.role === 'trainer') {
          router.push(ROUTES.TRAINER_CLIENTS);
        } else {
          router.push(ROUTES.ATHLETE_WORKOUTS);
        }
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}
