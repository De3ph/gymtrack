import { getTrainerProfileCached, verifySession } from "@/lib/dal";
import { TrainerProfileClient } from "./TrainerProfileClient";
import { DataError } from "@/components/features/DataError";

export default async function TrainerProfilePage() {
  await verifySession();
  let profile: Record<string, unknown>;
  try {
    profile = await getTrainerProfileCached();
  } catch (err) {
    return (
      <DataError
        title="Failed to load trainer profile"
        message={
          err instanceof Error ? err.message : "An unexpected error occurred"
        }
      />
    );
  }
  return <TrainerProfileClient initialProfile={profile} />;
}
