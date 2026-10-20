"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import * as Sentry from "@sentry/nextjs";
import { StatusPage } from "@/components/features/StatusPage";
import { ROUTES } from "@/lib/routes";

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
    Sentry.captureException(error);
  }, [error]);

  return (
    <StatusPage
      variant="error"
      digest={error.digest}
      onRetry={reset}
      backHref={ROUTES.DASHBOARD}
      backLabel={t("navigation.dashboard")}
    />
  );
}
