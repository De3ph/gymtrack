import Link from "next/link";
import { linkStyles } from "./dashboard-styles";

export function TrainerNav() {
  return (
    <>
      <Link
        href='/trainer/clients'
        className={linkStyles.nav}
      >
        My Clients
      </Link>
      <Link
        href='/trainer/profile'
        className={linkStyles.nav}
      >
        My Profile
      </Link>
    </>
  );
}
