import { verifySession } from "@/lib/dal";
import { ProfileClient } from "./_components/ProfileClient";

export default async function ProfilePage() {
  await verifySession();
  return <ProfileClient />;
}
