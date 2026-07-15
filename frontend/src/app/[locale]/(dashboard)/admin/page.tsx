import { Suspense } from "react";
import { getAdminStatsCached, verifyAdmin } from "@/lib/dal";
import type { AdminDashboardStats } from "@/lib/api/adminApi";
import { AdminDashboardClient } from "./_components/AdminDashboardClient";
import { AdminDashboardSkeleton } from "./_components/AdminDashboardSkeleton";
import { DataError } from "@/components/features/DataError";

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
  let stats: AdminDashboardStats;
  try {
    // unstable_cache: 60s LRU across requests, tagged for invalidation
    stats = await getAdminStatsCached();
  } catch (err) {
    return (
      <DataError
        title="Failed to load dashboard stats"
        message={
          err instanceof Error ? err.message : "An unexpected error occurred"
        }
      />
    );
  }
  return <AdminDashboardClient stats={stats} />;
}
