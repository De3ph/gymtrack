"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium text-destructive">{t("errors.unexpected_error")}</p>
        <h2 className="text-2xl font-semibold tracking-tight">{t("errors.generic")}</h2>
        <p className="text-sm text-muted-foreground">{t("errors.server_error")}</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset} variant="default">
          {t("actions.retry")}
        </Button>
        <Button onClick={() => window.history.back()} variant="outline">
          {t("actions.back")}
        </Button>
      </div>
    </div>
  );
}
