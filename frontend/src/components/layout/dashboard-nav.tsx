import Link from "next/link";
import { linkStyles } from "./dashboard-styles";
import { AthleteNav } from "./athlete-nav";
import { TrainerNav } from "./trainer-nav";
import { AdminNav } from "./admin-nav";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./theme-toggle";
import { LocaleToggle } from "./locale-toggle";
import { UserAvatarMenu } from "./user-avatar-menu";
import { ROUTES } from "@/lib/routes";

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
  return (
    <nav className="bg-card shadow-sm">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          <div className="flex items-center">
            <Link href={ROUTES.DASHBOARD} className={linkStyles.brand}>
              GymTrack
            </Link>
            <div className="ml-10 hidden lg:flex lg:items-baseline lg:space-x-4">
              {userRole === "athlete" && <AthleteNav />}
              {userRole === "trainer" && <TrainerNav />}
              {userRole === "admin" && <AdminNav />}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LocaleToggle />
            </div>
            <div className="hidden lg:block">
              <UserAvatarMenu
                userName={userName}
                userRole={userRole}
                onLogout={onLogout}
              />
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
