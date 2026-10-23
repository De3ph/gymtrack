"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { ApiErrorHandler } from "@/lib/error-handler";
import { DataError } from "@/components/features/DataError";
import { AdminDashboardClient } from "@/components/features/dashboard/AdminDashboardClient";
import { AdminDashboardSkeleton } from "@/components/features/dashboard/AdminDashboardSkeleton";

/**
 * Client-side admin dashboard used by `/dashboard` for admins. `/admin`
 * renders the same panel from a cached RSC fetch; this variant keeps the
 * role dashboard usable without a hard redirect.
 */
export function AdminDashboardPanel() {
  const { data, error, isPending, refetch } = useQuery({
    queryKey: qk.admin.stats,
    queryFn: adminApi.getDashboardStats,
  });

  if (isPending) {
    return <AdminDashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <DataError
        message={ApiErrorHandler.handle(error)}
        onRetry={() => refetch()}
      />
    );
  }

  return <AdminDashboardClient stats={data} />;
}
