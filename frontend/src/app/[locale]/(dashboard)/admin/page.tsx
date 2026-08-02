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
export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<AdminDashboardSkeleton />}>
      <AdminDashboardContent />
    </Suspense>
  );
}

async function AdminDashboardContent() {
  const session = await verifyAdmin();
  const t = await getTranslations("common");
  let stats: AdminDashboardStats;
  try {
    stats = await getAdminStatsCached(session.accessToken);
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
