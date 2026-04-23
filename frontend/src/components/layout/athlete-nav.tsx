import Link from "next/link";
import { linkStyles } from "./dashboard-styles";
import { ROUTES } from "@/lib/routes";

export function AthleteNav() {
  return (
    <>
      <Link
        href={ROUTES.ATHLETE_WORKOUTS}
        className={linkStyles.nav}
      >
        Workouts
      </Link>
      <Link
        href={ROUTES.ATHLETE_MEALS}
        className={linkStyles.nav}
      >
        Meals
      </Link>
      <Link
        href={ROUTES.ATHLETE_TRAINERS}
        className={linkStyles.nav}
      >
        Find Trainers
      </Link>
    </>
  );
}
