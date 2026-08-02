import { Suspense } from "react";
import { getTrainerProfileCached, verifySession } from "@/lib/dal";
import { TrainerProfileClient } from "./TrainerProfileClient";
import { DataError } from "@/components/features/DataError";
import { getTranslations } from "next-intl/server";
import type { TrainerProfile } from "@/types";

export default function TrainerProfilePage() {
  return (
    <Suspense fallback={null}>
      <TrainerProfileContent />
    </Suspense>
  );
}

async function TrainerProfileContent() {
  const session = await verifySession();
  const t = await getTranslations("common");
  let profile: TrainerProfile;
  try {
    profile = await getTrainerProfileCached(session.accessToken, session.userId);
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
