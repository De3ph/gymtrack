import { redirect } from 'next/navigation';
import { getSession } from '@/lib/dal';
import { ROUTES } from '@/lib/routes';
import { LandingClient } from './LandingClient';

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect(
      session.role === 'trainer'
        ? ROUTES.TRAINER_CLIENTS
        : ROUTES.ATHLETE_WORKOUTS
    );
  }
  return <LandingClient />;
}
