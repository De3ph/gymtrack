import { Suspense } from "react";
import { getAdminStatsCached, verifyAdmin } from "@/lib/dal";
import { AdminDashboardClient } from "./_components/AdminDashboardClient";
import { AdminDashboardSkeleton } from "./_components/AdminDashboardSkeleton";

/**
 * RSC shell: server-side role gate + cached data fetch +
 * Suspense streaming for the interactive client island.
 */
export default async function AdminDashboardPage() {
  // Server-side auth/role gate (defense in depth — middleware already blocks)
  await verifyAdmin();

  return (
    <Suspense fallback={<AdminDashboardSkeleton />}>
      <AdminStatsFetcher />
    </Suspense>
  );
}

async function AdminStatsFetcher() {
  // unstable_cache: 60s LRU across requests, tagged for invalidation
  const stats = await getAdminStatsCached();
  return <AdminDashboardClient stats={stats} />;
}
