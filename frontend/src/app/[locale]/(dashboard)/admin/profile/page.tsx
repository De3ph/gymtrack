import { Suspense } from "react";
import { verifyAdmin } from "@/lib/dal";
import { AdminProfileClient } from "./_components/AdminProfileClient";

export default function AdminProfilePage() {
  return (
    <Suspense fallback={null}>
      <AdminProfileContent />
    </Suspense>
  );
}

async function AdminProfileContent() {
  await verifyAdmin();
  return <AdminProfileClient />;
}
