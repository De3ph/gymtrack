import { Suspense } from "react";
import ClientDetailClient from "./ClientDetailClient";

export default function ClientDetailPage() {
  return (
    <Suspense fallback={null}>
      <ClientDetailClient />
    </Suspense>
  );
}
