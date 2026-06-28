import { verifyAdmin } from "@/lib/dal";
import { AdminProfileClient } from "./_components/AdminProfileClient";

/**
 * RSC shell: server-side role gate around the interactive password form.
 * No data fetch here — profile state lives in the auth store.
 */
export default async function AdminProfilePage() {
  await verifyAdmin();
  return <AdminProfileClient />;
}
