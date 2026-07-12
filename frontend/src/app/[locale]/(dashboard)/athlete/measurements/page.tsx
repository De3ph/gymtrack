import { getLatestBodyMeasurementCached, verifySession } from "@/lib/dal";
import { MeasurementsClient } from "./MeasurementsClient";

export default async function BodyMeasurementsPage() {
  await verifySession();
  const latest = await getLatestBodyMeasurementCached();
  return <MeasurementsClient latest={latest} />;
}
