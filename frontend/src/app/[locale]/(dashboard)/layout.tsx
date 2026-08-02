import { Suspense } from "react";
import { getSession } from '@/lib/dal';
import { redirect } from 'next/navigation';
import { DashboardClientShell } from './DashboardClientShell';

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
  return <DashboardClientShell>{children}</DashboardClientShell>;
}
