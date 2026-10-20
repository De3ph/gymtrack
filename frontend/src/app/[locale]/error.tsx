"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { StatusPage } from "@/components/features/StatusPage";
import { ROUTES } from "@/lib/routes";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <StatusPage
        variant="error"
        digest={error.digest}
        onRetry={reset}
        backHref={ROUTES.HOME}
        className="min-h-screen"
      />
    </main>
  );
}
