"use client";

import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusScreen } from "@/components/features/StatusScreen";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/routes";

type StatusVariant = "error" | "not-found";

interface StatusPageProps {
  /** 500 renders the failure copy and the retry action; 404 renders the dead-link copy. */
  variant?: StatusVariant;
  /** Reference code from Next.js — quote it when reporting the failure. */
  digest?: string;
  /** Client-side retry. Renders the primary action on the 500 page. */
  onRetry?: () => void;
  /** Where the action goes. Defaults to the landing page. */
  backHref?: string;
  /** Label for the action. Defaults to "Back" (500) or "Home" (404). */
  backLabel?: string;
  className?: string;
}

/**
 * Translated status screen for the 500 and 404 boundaries. The global 404
 * page (no layout, no i18n provider) renders `StatusScreen` directly.
 */
export function StatusPage({
  variant = "error",
  digest,
  onRetry,
  backHref = ROUTES.HOME,
  backLabel,
  className,
}: StatusPageProps) {
  const t = useTranslations("common.errors");
  const tActions = useTranslations("common.actions");
  const tNavigation = useTranslations("common.navigation");

  const isError = variant === "error";

  return (
    <StatusScreen
      className={className}
      code={isError ? "500" : "404"}
      kicker={isError ? t("error_title") : t("not_found_kicker")}
      title={isError ? t("server_error_title") : t("not_found_title")}
      description={
        isError ? t("server_error_description") : t("not_found_description")
      }
      digest={isError ? digest : undefined}
      referenceLabel={isError ? t("reference") : undefined}
      actions={
        <>
          {isError && onRetry ? (
            <Button
              onClick={onRetry}
              className="rounded-none font-mono text-xs uppercase tracking-[0.18em]"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              {tActions("retry")}
            </Button>
          ) : null}
          <Link
            href={backHref}
            className={buttonVariants({
              variant: isError ? "outline" : "default",
              className:
                "rounded-none font-mono text-xs uppercase tracking-[0.18em]",
            })}
          >
            {backLabel ?? (isError ? tActions("back") : tNavigation("home"))}
          </Link>
        </>
      }
    />
  );
}
