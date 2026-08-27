"use client";

import { CoachingRequestsList } from "@/components/features/coaching/CoachingRequestsList";
import { useTranslations } from "next-intl";

export default function CoachingRequestsPage() {
  const t = useTranslations("trainer.requests");

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t("title")}
        </h1>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <div className="border border-border">
        <header className="border-b border-border px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {t("pending_title")}
          </h2>
        </header>
        <div className="px-4 py-3 sm:px-6 sm:py-4">
          <CoachingRequestsList userType="trainer" />
        </div>
      </div>
    </div>
  );
}
