import { getSession } from '@/lib/dal';
import { redirect } from 'next/navigation';
import { DashboardClientShell } from './DashboardClientShell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect('/login');
  return <DashboardClientShell>{children}</DashboardClientShell>;
}
