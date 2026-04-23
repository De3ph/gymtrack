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
    <nav className='bg-white shadow-sm dark:bg-gray-800'>
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
            <span className='text-sm text-gray-700 dark:text-gray-300'>
              {userName} ({userRole})
            </span>
            <button
              onClick={onLogout}
              className='rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
