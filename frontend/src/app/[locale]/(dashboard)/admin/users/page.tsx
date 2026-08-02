import { Suspense } from "react";
import { getAdminUsers, verifyAdmin } from "@/lib/dal";
import type { AdminUserListResponse } from "@/lib/api/adminApi";
import { UsersTableSkeleton } from "./_components/UsersTableSkeleton";
import { UsersTableClientWrapper } from "./_components/UsersTableClientWrapper";
import { DataError } from "@/components/features/DataError";
import { getTranslations } from "next-intl/server";

/**
 * RSC shell: server-side role gate + initial data fetch +
 * Suspense boundary around the dynamic client table island.
 */
export default function AdminUsersPage() {
  return (
    <Suspense fallback={<UsersTableSkeleton />}>
      <UsersTableContent />
    </Suspense>
  );
}

async function UsersTableContent() {
  await verifyAdmin();
  const t = await getTranslations("common");
  let initialData: AdminUserListResponse;
  try {
    initialData = await getAdminUsers({ limit: 25 });
  } catch (err) {
    return (
      <DataError
        title={t("errors.failed_load_users")}
        message={
          err instanceof Error ? err.message : t("errors.unexpected_error")
        }
      />
    );
  }
  return <UsersTableClientWrapper initialData={initialData} />;
}
