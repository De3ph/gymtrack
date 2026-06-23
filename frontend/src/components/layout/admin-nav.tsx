import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { linkStyles } from "./dashboard-styles";
import { ROUTES } from "@/lib/routes";

export function AdminNav() {
  const pathname = usePathname();

  return (
    <>
      <Link
        href={ROUTES.ADMIN_DASHBOARD}
        className={cn(
          linkStyles.nav,
          pathname === ROUTES.ADMIN_DASHBOARD && "bg-gray-200 dark:bg-gray-700",
        )}
      >
        Dashboard
      </Link>
      <Link
        href={ROUTES.ADMIN_USERS}
        className={cn(
          linkStyles.nav,
          pathname.startsWith(ROUTES.ADMIN_USERS) &&
            "bg-gray-200 dark:bg-gray-700",
        )}
      >
        Users
      </Link>
      <Link
        href={ROUTES.ADMIN_PROFILE}
        className={cn(
          linkStyles.nav,
          pathname === ROUTES.ADMIN_PROFILE && "bg-gray-200 dark:bg-gray-700",
        )}
      >
        Profile
      </Link>
    </>
  );
}
