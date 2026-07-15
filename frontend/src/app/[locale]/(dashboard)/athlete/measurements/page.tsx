import { getLatestBodyMeasurementCached, verifySession } from "@/lib/dal";
import { MeasurementsClient } from "./MeasurementsClient";
import { DataError } from "@/components/features/DataError";

export default async function BodyMeasurementsPage() {
  await verifySession();
  let latest: Record<string, unknown> | null;
  try {
    latest = await getLatestBodyMeasurementCached();
  } catch (err) {
    return (
      <DataError
        title="Failed to load body measurements"
        message={
          err instanceof Error ? err.message : "An unexpected error occurred"
        }
      />
    );
  }
  return <MeasurementsClient latest={latest} />;
}
