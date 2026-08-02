import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getAdminUserDetail, verifyAdmin } from "@/lib/dal";
import { UserDetailClient } from "./_components/UserDetailClient";
import { UserDetailSkeleton } from "./_components/UserDetailSkeleton";
import { DataError } from "@/components/features/DataError";
import { getTranslations } from "next-intl/server";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * RSC shell: server-side role gate + per-request cached data fetch +
 * Suspense streaming for the client detail island.
 */
export default function AdminUserDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<UserDetailSkeleton />}>
      <UserDetailContent params={params} />
    </Suspense>
  );
}

async function UserDetailContent({ params }: { params: Promise<{ id: string }> }) {
  await verifyAdmin();
  const { id } = await params;
  const t = await getTranslations("common");
  let detail;
  try {
    detail = await getAdminUserDetail(id);
  } catch (err) {
    if (err instanceof Error && err.message.includes("404")) {
      notFound();
    }
    return (
      <DataError
        title={t("errors.failed_load_user_details")}
        message={
          err instanceof Error ? err.message : t("errors.unexpected_error")
        }
      />
    );
  }
  return <UserDetailClient detail={detail} />;
}
