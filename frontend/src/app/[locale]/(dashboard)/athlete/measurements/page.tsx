import { Suspense } from "react";
import { getLatestBodyMeasurementCached, verifySession } from "@/lib/dal";
import { MeasurementsClient } from "./MeasurementsClient";
import { DataError } from "@/components/features/DataError";
import { getTranslations } from "next-intl/server";
import type { BodyMeasurement } from "@/types";

export default function BodyMeasurementsPage() {
  return (
    <Suspense fallback={null}>
      <BodyMeasurementsContent />
    </Suspense>
  );
}

async function BodyMeasurementsContent() {
  const session = await verifySession();
  const t = await getTranslations("common");
  let latest: BodyMeasurement | null;
  try {
    latest = await getLatestBodyMeasurementCached(session.accessToken, session.userId);
  } catch (err) {
    return (
      <DataError
        title={t("errors.failed_load_body_measurements")}
        message={
          err instanceof Error ? err.message : t("errors.unexpected_error")
        }
      />
    );
  }
  return <MeasurementsClient latest={latest} />;
}
