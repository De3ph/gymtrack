import { Suspense } from "react";
import { cookies } from "next/headers";
import { getCurrentUser } from '@/lib/dal';
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
  // Both reads are independent and can overlap: the user comes from the Go
  // backend, the sidebar preference straight from the request cookie. The
  // session gate lives inside getCurrentUser (verifySession redirects).
  const [initialUser, cookieStore] = await Promise.all([
    getCurrentUser(),
    cookies(),
  ]);

  // Keep the rail's open/collapsed state stable across reloads and SSR.
  const defaultSidebarOpen =
    cookieStore.get(SIDEBAR_COOKIE_NAME)?.value !== 'false';

  return (
    <DashboardClientShell
      initialUser={initialUser}
      defaultSidebarOpen={defaultSidebarOpen}
    >
      {children}
    </DashboardClientShell>
  );
}
