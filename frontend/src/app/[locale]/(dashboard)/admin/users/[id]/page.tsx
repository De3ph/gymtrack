import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getAdminUserDetail, verifyAdmin } from "@/lib/dal";
import { UserDetailClient } from "./_components/UserDetailClient";
import { UserDetailSkeleton } from "./_components/UserDetailSkeleton";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * RSC shell: server-side role gate + per-request cached data fetch +
 * Suspense streaming for the client detail island.
 */
export default async function AdminUserDetailPage({ params }: PageProps) {
  await verifyAdmin();
  const { id } = await params;

  return (
    <Suspense fallback={<UserDetailSkeleton />}>
      <UserDetailFetcher userId={id} />
    </Suspense>
  );
}

async function UserDetailFetcher({ userId }: { userId: string }) {
  let detail;
  try {
    detail = await getAdminUserDetail(userId);
  } catch {
    notFound();
  }
  return <UserDetailClient detail={detail} />;
}
