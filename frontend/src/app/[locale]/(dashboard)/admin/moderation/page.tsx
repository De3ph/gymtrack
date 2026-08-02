import { Suspense } from "react";
import { verifyAdmin } from "@/lib/dal";
import ModerationClient from "./_components/ModerationClient";

export default function AdminModerationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ModerationContent />
    </Suspense>
  );
}

async function ModerationContent() {
  await verifyAdmin();
  return <ModerationClient />;
}