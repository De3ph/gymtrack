import { getTrainerProfileCached, verifySession } from "@/lib/dal";
import { TrainerProfileClient } from "./TrainerProfileClient";
import { DataError } from "@/components/features/DataError";
import { getTranslations } from "next-intl/server";

export default async function TrainerProfilePage() {
  await verifySession();
  const t = await getTranslations("common");
  let profile: Record<string, unknown>;
  try {
    profile = await getTrainerProfileCached();
  } catch (err) {
    return (
      <DataError
        title={t("errors.failed_load_trainer_profile")}
        message={
          err instanceof Error ? err.message : t("errors.unexpected_error")
        }
      />
    );
  }
  return <TrainerProfileClient initialProfile={profile} />;
}
