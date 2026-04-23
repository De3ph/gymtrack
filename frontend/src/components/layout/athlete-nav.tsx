import Link from "next/link";
import { linkStyles } from "./dashboard-styles";

export function AthleteNav() {
  return (
    <>
      <Link
        href='/athlete/workouts'
        className={linkStyles.nav}
      >
        Workouts
      </Link>
      <Link
        href='/athlete/meals'
        className={linkStyles.nav}
      >
        Meals
      </Link>
      <Link
        href='/athlete/trainers'
        className={linkStyles.nav}
      >
        Find Trainers
      </Link>
    </>
  );
}
