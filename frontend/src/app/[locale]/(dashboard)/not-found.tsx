import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";

export default async function DashboardNotFound() {
  const t = await getTranslations("common");

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h2 className="text-2xl font-semibold tracking-tight">{t("errors.not_found")}</h2>
        <p className="text-sm text-muted-foreground">{t("errors.generic")}</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/dashboard" className={buttonVariants({ variant: "default" })}>
          {t("navigation.dashboard")}
        </Link>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          {t("actions.back")}
        </Link>
      </div>
    </div>
  );
}
