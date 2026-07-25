import { Suspense } from "react";
import { getAdminStatsCached, verifyAdmin } from "@/lib/dal";
import type { AdminDashboardStats } from "@/lib/api/adminApi";
import { AdminDashboardClient } from "./_components/AdminDashboardClient";
import { AdminDashboardSkeleton } from "./_components/AdminDashboardSkeleton";
import { DataError } from "@/components/features/DataError";
import { getTranslations } from "next-intl/server";

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
  const t = await getTranslations("common");
  let stats: AdminDashboardStats;
  try {
    // unstable_cache: 60s LRU across requests, tagged for invalidation
    stats = await getAdminStatsCached();
  } catch (err) {
    return (
      <DataError
        title={t("errors.failed_load_dashboard_stats")}
        message={
          err instanceof Error ? err.message : t("errors.unexpected_error")
        }
      />
    );
  }
  return <AdminDashboardClient stats={stats} />;
}
