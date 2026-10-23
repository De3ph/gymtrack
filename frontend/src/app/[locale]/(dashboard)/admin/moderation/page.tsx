import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { verifyAdmin } from "@/lib/dal";
import ModerationClient from "./_components/ModerationClient";

export default async function AdminModerationPage() {
  const t = await getTranslations("common");
  return (
    <Suspense fallback={<div>{t("loading")}</div>}>
      <ModerationContent />
    </Suspense>
  );
}

async function ModerationContent() {
  await verifyAdmin();
  return <ModerationClient />;
}
