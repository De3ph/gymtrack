"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { Geist_Mono, Inter } from "next/font/google";
import { useEffect } from "react";
import { StatusScreen } from "@/components/features/StatusScreen";
import { ThemeBootScript } from "@/components/layout/theme-boot-script";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import "./globals.css";

/**
 * Last-resort boundary: it replaces the root layout, so it carries its own
 * styles, fonts and theme bootstrap. English only — the i18n provider lives
 * in the layout, which is not rendered here.
 */

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});
const geistMono = Geist_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist-mono",
  display: "swap",
});

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" className={cn(inter.variable, geistMono.variable)} suppressHydrationWarning>
      <head>
        <ThemeBootScript />
      </head>
      <body className="antialiased">
        <StatusScreen
          code="500"
          kicker="Error"
          title="Server error"
          description="The request failed on the GymTrack server. Retry the action. If it keeps failing, quote the reference code when you report it."
          digest={error.digest}
          referenceLabel="Reference"
          actions={
            <>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className={buttonVariants({
                  variant: "default",
                  className:
                    "rounded-none font-mono text-xs uppercase tracking-[0.18em]",
                })}
              >
                Retry
              </button>
              <Link
                href="/"
                className={buttonVariants({
                  variant: "outline",
                  className:
                    "rounded-none font-mono text-xs uppercase tracking-[0.18em]",
                })}
              >
                Back
              </Link>
            </>
          }
        />
      </body>
    </html>
  );
}
