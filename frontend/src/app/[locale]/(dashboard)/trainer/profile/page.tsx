import { getTrainerProfileCached, verifySession } from "@/lib/dal";
import { TrainerProfileClient } from "./TrainerProfileClient";

export default async function TrainerProfilePage() {
  await verifySession();
  const profile = await getTrainerProfileCached();
  return <TrainerProfileClient initialProfile={profile} />;
}

