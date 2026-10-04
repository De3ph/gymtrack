import { Suspense } from "react";
import { cookies } from "next/headers";
import { getSession } from '@/lib/dal';
import { redirect } from 'next/navigation';
import { DashboardClientShell } from './DashboardClientShell';

/** Mirrors `SIDEBAR_COOKIE_NAME` in `@/components/ui/sidebar`. */
const SIDEBAR_COOKIE_NAME = 'sidebar_state';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <DashboardAuthGate>{children}</DashboardAuthGate>
    </Suspense>
  );
}

async function DashboardAuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  // Keep the rail's open/collapsed state stable across reloads and SSR.
  const defaultSidebarOpen =
    (await cookies()).get(SIDEBAR_COOKIE_NAME)?.value !== 'false';

  return (
    <DashboardClientShell defaultSidebarOpen={defaultSidebarOpen}>
      {children}
    </DashboardClientShell>
  );
}
