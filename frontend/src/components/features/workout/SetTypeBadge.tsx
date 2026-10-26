"use client";

import { useTranslations } from "next-intl";
import type { SetType } from "@/types";
import { DEFAULT_SET_TYPE } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface SetTypeBadgeProps {
  type?: SetType;
  className?: string;
}

/**
 * Compact label for a non-working set type. Working sets are the default, so
 * they carry no badge: showing one on every set would add noise without
 * telling the reader anything.
 */
export function SetTypeBadge({ type, className }: SetTypeBadgeProps) {
  const t = useTranslations("workout.set_types");
  const current = type || DEFAULT_SET_TYPE;

  if (current === "working") return null;

  return (
    <span
      className={cn(
        "border border-border bg-muted px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground",
        className,
      )}
      data-testid="set-type-badge"
    >
      {t(current)}
    </span>
  );
}
