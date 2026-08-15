import { useTranslations } from 'next-intl';
import { ROUTES } from '@/lib/routes';
import { NavLink } from '@/components/ui/nav-link';

export function AthleteNav() {
  const tNav = useTranslations('common.navigation');
  const tAthlete = useTranslations('athlete');

  return (
    <>
      <NavLink href={ROUTES.ATHLETE_WORKOUTS} activeMatch="endsWith">
        {tNav('workouts')}
      </NavLink>
      <NavLink href={ROUTES.ATHLETE_MEALS} activeMatch="endsWith">
        {tNav('meals')}
      </NavLink>
      <NavLink href={ROUTES.ATHLETE_MEASUREMENTS} activeMatch="endsWith">
        {tNav('measurements')}
      </NavLink>
      <NavLink href={ROUTES.ATHLETE_TRAINERS} activeMatch="endsWith">
        {tAthlete('trainers.title')}
      </NavLink>
      <NavLink href={ROUTES.ATHLETE_WORKOUT_PLANS} activeMatch="endsWith">
        {tNav('workout_plans')}
      </NavLink>
    </>
  );
}
