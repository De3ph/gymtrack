import { getTranslations } from "next-intl/server";
import { StatusPage } from "@/components/features/StatusPage";
import { ROUTES } from "@/lib/routes";

export default async function DashboardNotFound() {
  const t = await getTranslations("common");

  return (
    <StatusPage
      variant="not-found"
      backHref={ROUTES.DASHBOARD}
      backLabel={t("navigation.dashboard")}
    />
  );
}
