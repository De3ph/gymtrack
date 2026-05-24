import Link from "next/link";
import { linkStyles } from "./dashboard-styles";
import { ROUTES } from "@/lib/routes";
import { useTranslations } from 'next-intl';

export function TrainerNav() {
  const tNav = useTranslations('common.navigation');
  const tTrainer = useTranslations('trainer');

  return (
    <>
      <Link
        href={ROUTES.TRAINER_CLIENTS}
        className={linkStyles.nav}
      >
        {tTrainer('clients.title')}
      </Link>
      <Link
        href={ROUTES.TRAINER_PROFILE}
        className={linkStyles.nav}
      >
        {tNav('profile')}
      </Link>
      <Link
        href={ROUTES.TRAINER_WORKOUT_PLANS}
        className={linkStyles.nav}
      >
        {tNav('workout_plans')}
      </Link>
    </>
  );
}
