import { useTranslations } from 'next-intl';
import { ROUTES } from '@/lib/routes';
import { NavLink } from '@/components/ui/nav-link';

export function TrainerNav() {
  const tNav = useTranslations('common.navigation');
  const tTrainer = useTranslations('trainer');

  return (
    <>
      <NavLink href={ROUTES.TRAINER_CLIENTS} activeMatch="endsWith">
        {tTrainer('clients.title')}
      </NavLink>
      <NavLink href={ROUTES.TRAINER_PROFILE} activeMatch="endsWith">
        {tNav('profile')}
      </NavLink>
      <NavLink href={ROUTES.TRAINER_WORKOUT_PLANS} activeMatch="endsWith">
        {tNav('workout_plans')}
      </NavLink>
    </>
  );
}
