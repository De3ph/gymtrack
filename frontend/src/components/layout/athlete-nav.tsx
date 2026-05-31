import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { linkStyles } from "./dashboard-styles";
import { ROUTES } from "@/lib/routes";
import { useTranslations } from 'next-intl';

export function AthleteNav() {
  const tNav = useTranslations('common.navigation');
  const tAthlete = useTranslations('athlete');
  const pathname = usePathname();

  return (
    <>
      <Link
        href={ROUTES.ATHLETE_WORKOUTS}
        className={cn(linkStyles.nav, pathname.endsWith(ROUTES.ATHLETE_WORKOUTS) && "bg-gray-200 dark:bg-gray-700")}
      >
        {tNav('workouts')}
      </Link>
      <Link
        href={ROUTES.ATHLETE_MEALS}
        className={cn(linkStyles.nav, pathname.endsWith(ROUTES.ATHLETE_MEALS) && "bg-gray-200 dark:bg-gray-700")}
      >
        {tNav('meals')}
      </Link>
      <Link
        href={ROUTES.ATHLETE_TRAINERS}
        className={cn(linkStyles.nav, pathname.endsWith(ROUTES.ATHLETE_TRAINERS) && "bg-gray-200 dark:bg-gray-700")}
      >
        {tAthlete('trainers.title')}
      </Link>
      <Link
        href={ROUTES.ATHLETE_WORKOUT_PLANS}
        className={cn(linkStyles.nav, pathname.endsWith(ROUTES.ATHLETE_WORKOUT_PLANS) && "bg-gray-200 dark:bg-gray-700")}
      >
        {tNav('workout_plans')}
      </Link>
    </>
  );
}
