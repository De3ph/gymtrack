import Link from "next/link";
import { linkStyles } from "./dashboard-styles";
import { AthleteNav } from "./athlete-nav";
import { TrainerNav } from "./trainer-nav";
import { ROUTES } from "@/lib/routes";

interface DashboardNavProps {
  userRole?: string;
  userName?: string;
  onLogout: () => void;
}

export function DashboardNav({ userRole, userName, onLogout }: DashboardNavProps) {
  return (
    <nav className='bg-card shadow-sm'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <div className='flex h-16 justify-between items-center'>
          <div className='flex items-center'>
            <Link
              href={ROUTES.PROFILE}
              className={linkStyles.brand}
            >
              GymTrack
            </Link>
            <div className='ml-10 flex items-baseline space-x-4'>
              {userRole === "athlete" && <AthleteNav />}
              {userRole === "trainer" && <TrainerNav />}
            </div>
          </div>
          <div className='flex items-center gap-4'>
            <span className='text-sm text-foreground'>
              {userName} ({userRole})
            </span>
            <button
              onClick={onLogout}
              className='rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80'
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
