import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { linkStyles } from "./dashboard-styles";
import { ROUTES } from "@/lib/routes";
import { useTranslations } from 'next-intl';

export function TrainerNav() {
  const tNav = useTranslations('common.navigation');
  const tTrainer = useTranslations('trainer');
  const pathname = usePathname();

  return (
    <>
      <Link
        href={ROUTES.TRAINER_CLIENTS}
        className={cn(linkStyles.nav, pathname.endsWith(ROUTES.TRAINER_CLIENTS) && "bg-gray-200 dark:bg-gray-700")}
      >
        {tTrainer('clients.title')}
      </Link>
      <Link
        href={ROUTES.TRAINER_PROFILE}
        className={cn(linkStyles.nav, pathname.endsWith(ROUTES.TRAINER_PROFILE) && "bg-gray-200 dark:bg-gray-700")}
      >
        {tNav('profile')}
      </Link>
      <Link
        href={ROUTES.TRAINER_WORKOUT_PLANS}
        className={cn(linkStyles.nav, pathname.endsWith(ROUTES.TRAINER_WORKOUT_PLANS) && "bg-gray-200 dark:bg-gray-700")}
      >
        {tNav('workout_plans')}
      </Link>
    </>
  );
}
