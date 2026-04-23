import Link from "next/link";
import { linkStyles } from "./dashboard-styles";
import { ROUTES } from "@/lib/routes";

export function TrainerNav() {
  return (
    <>
      <Link
        href={ROUTES.TRAINER_CLIENTS}
        className={linkStyles.nav}
      >
        My Clients
      </Link>
      <Link
        href={ROUTES.TRAINER_PROFILE}
        className={linkStyles.nav}
      >
        My Profile
      </Link>
    </>
  );
}
