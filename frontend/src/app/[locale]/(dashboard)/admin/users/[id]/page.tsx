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
  const t = await getTranslations("common");
  let detail;
  try {
    detail = await getAdminUserDetail(userId);
  } catch (err) {
    // 404 from the backend → show not-found page
    if (err instanceof Error && err.message.includes("404")) {
      notFound();
    }
    // Everything else → show a user-friendly error
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
