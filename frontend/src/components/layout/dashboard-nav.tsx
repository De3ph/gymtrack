import Link from "next/link";
import { linkStyles } from "./dashboard-styles";
import { AthleteNav } from "./athlete-nav";
import { TrainerNav } from "./trainer-nav";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./theme-toggle";
import { LocaleToggle } from "./locale-toggle";
import { ROUTES } from "@/lib/routes";
import { useTranslations } from "next-intl";

interface DashboardNavProps {
  userRole?: string;
  userName?: string;
  onLogout: () => void;
}

export function DashboardNav({
  userRole,
  userName,
  onLogout,
}: DashboardNavProps) {
  const tCommon = useTranslations("common.navigation");

  return (
    <nav className="bg-card shadow-sm">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          <div className="flex items-center">
            <Link href={ROUTES.PROFILE} className={linkStyles.brand}>
              GymTrack
            </Link>
            <div className="ml-10 hidden lg:flex lg:items-baseline lg:space-x-4">
              {userRole === "athlete" && <AthleteNav />}
              {userRole === "trainer" && <TrainerNav />}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LocaleToggle />
            </div>
            <div className="hidden lg:flex lg:items-center lg:gap-4">
              <span className="text-sm text-foreground">
                {userName} ({userRole})
              </span>
              <button
                onClick={onLogout}
                className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
              >
                {tCommon("logout")}
              </button>
            </div>

            <MobileNav
              userRole={userRole}
              userName={userName}
              onLogout={onLogout}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
