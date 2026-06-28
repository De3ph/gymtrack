import { useTranslations } from "next-intl";
import { ROUTES } from "@/lib/routes";
import { NavLink } from "@/components/ui/nav-link";

export function AdminNav() {
  const t = useTranslations("admin.nav");

  return (
    <>
      <NavLink href={ROUTES.ADMIN_DASHBOARD} activeMatch="endsWith">
        {t("dashboard")}
      </NavLink>
      <NavLink href={ROUTES.ADMIN_USERS} activeMatch="includes">
        {t("users")}
      </NavLink>
      <NavLink href={ROUTES.ADMIN_PROFILE} activeMatch="endsWith">
        {t("profile")}
      </NavLink>
    </>
  );
}
