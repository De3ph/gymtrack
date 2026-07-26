import { Suspense } from "react";
import { verifyAdmin } from "@/lib/dal";
import ModerationClient from "./_components/ModerationClient";

export default async function AdminModerationPage() {
  await verifyAdmin();
  return <Suspense fallback={<div>Loading...</div>}><ModerationClient /></Suspense>;
}