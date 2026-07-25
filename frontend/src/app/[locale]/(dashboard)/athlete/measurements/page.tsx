import { getLatestBodyMeasurementCached, verifySession } from "@/lib/dal";
import { MeasurementsClient } from "./MeasurementsClient";
import { DataError } from "@/components/features/DataError";
import { getTranslations } from "next-intl/server";

export default async function BodyMeasurementsPage() {
  await verifySession();
  const t = await getTranslations("common");
  let latest: Record<string, unknown> | null;
  try {
    latest = await getLatestBodyMeasurementCached();
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
