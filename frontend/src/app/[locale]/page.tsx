import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/dal';
import { ROUTES } from '@/lib/routes';
import { LandingClient } from './LandingClient';

async function HomeContent(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;

  // If the client redirected here because auth failed (dashboard → HOME), don't
  // redirect back — the session cookie may still be present but the client-side
  // token/user fetch failed. Redirecting back would cause an infinite loop.
  if (searchParams.error !== 'auth_required') {
    const session = await getSession();
    if (session) {
      redirect(ROUTES.DASHBOARD);
    }
  }

  return <LandingClient />;
}

export default function Home(props: { searchParams: Promise<{ error?: string }> }) {
  return (
    <Suspense fallback={null}>
      <HomeContent searchParams={props.searchParams} />
    </Suspense>
  );
}
