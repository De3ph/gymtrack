"use client";

import { useTranslations } from "next-intl";
import type { SetType } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_SET_TYPE, SET_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface SetTypeSelectProps {
  value?: SetType;
  onChange: (value: SetType) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Picker for the four set classifications. Older rows may arrive without a
 * type; they display as "working" (the default) and become explicit on save.
 */
export function SetTypeSelect({
  value,
  onChange,
  disabled = false,
  className,
}: SetTypeSelectProps) {
  const t = useTranslations("workout.set_types");
  const current = value || DEFAULT_SET_TYPE;

  return (
    <Select
      value={current}
      onValueChange={(next) => onChange(next as SetType)}
      disabled={disabled}
    >
      <SelectTrigger
        size="sm"
        aria-label={t("label")}
        className={cn(
          "h-8 w-full min-w-0 rounded-none shadow-none",
          className,
        )}
        data-testid="set-type-select"
      >
        <SelectValue>{t(current)}</SelectValue>
      </SelectTrigger>
      <SelectContent className="rounded-none border border-border shadow-none ring-0">
        {SET_TYPES.map((type) => (
          <SelectItem key={type} value={type}>
            {t(type)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
