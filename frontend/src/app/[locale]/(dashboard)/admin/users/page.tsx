import { Suspense } from "react";
import { getAdminUsers, verifyAdmin } from "@/lib/dal";
import { UsersTableSkeleton } from "./_components/UsersTableSkeleton";
import { UsersTableClientWrapper } from "./_components/UsersTableClientWrapper";

/**
 * RSC shell: server-side role gate + initial data fetch +
 * Suspense boundary around the dynamic client table island.
 */
export default async function AdminUsersPage() {
  await verifyAdmin();

  return (
    <Suspense fallback={<UsersTableSkeleton />}>
      <UsersTableWithData />
    </Suspense>
  );
}

async function UsersTableWithData() {
  // Server-side initial data — handed to client via props as React Query seed
  const initialData = await getAdminUsers({ limit: 25 });
  return <UsersTableClientWrapper initialData={initialData} />;
}
