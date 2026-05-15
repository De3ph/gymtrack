import Link from "next/link";
import { linkStyles } from "./dashboard-styles";
import { ROUTES } from "@/lib/routes";
import { useTranslations } from 'next-intl';

export function AthleteNav() {
  const tNav = useTranslations('common.navigation');
  const tAthlete = useTranslations('athlete');

  return (
    <>
      <Link
        href={ROUTES.ATHLETE_WORKOUTS}
        className={linkStyles.nav}
      >
        {tNav('workouts')}
      </Link>
      <Link
        href={ROUTES.ATHLETE_MEALS}
        className={linkStyles.nav}
      >
        {tNav('meals')}
      </Link>
      <Link
        href={ROUTES.ATHLETE_TRAINERS}
        className={linkStyles.nav}
      >
        {tAthlete('trainers.title')}
      </Link>
    </>
  );
}
