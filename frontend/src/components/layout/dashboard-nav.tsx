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
    <nav 
      className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left section: Brand + Desktop Navigation */}
        <div className="flex items-center gap-8">
          <Link 
            href={ROUTES.DASHBOARD} 
            className={linkStyles.brand}
            aria-label="GymTrack Dashboard"
          >
            GymTrack
          </Link>
          
          {/* Desktop Navigation - Hidden on mobile */}
          <div className="hidden lg:flex lg:items-center lg:gap-1" role="menubar">
            {userRole === "athlete" && <AthleteNav />}
            {userRole === "trainer" && <TrainerNav />}
            {userRole === "admin" && <AdminNav />}
          </div>
        </div>

        {/* Right section: Actions + User Menu */}
        <div className="flex items-center gap-2">
          {/* Theme and Locale toggles */}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LocaleToggle />
          </div>

          {/* User Avatar Menu - Hidden on mobile */}
          <div className="hidden lg:block">
            <UserAvatarMenu
              userName={userName}
              userRole={userRole}
              onLogout={onLogout}
            />
          </div>

          {/* Mobile Navigation */}
          <MobileNav
            userRole={userRole}
            userName={userName}
            onLogout={onLogout}
          />
        </div>
      </div>
    </nav>
  );
}
