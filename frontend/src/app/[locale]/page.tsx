import { redirect } from 'next/navigation';
import { getSession } from '@/lib/dal';
import { ROUTES } from '@/lib/routes';
import { LandingClient } from './LandingClient';

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect(ROUTES.DASHBOARD);
  }
  return <LandingClient />;
}
