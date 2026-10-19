"use client";

import { Filter, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useTranslations } from "next-intl";
import type { BodyMeasurementFilter } from "./BodyMeasurementList";
import { useDeferredFilter } from "@/lib/hooks/use-deferred-filter";
import { fromDateRange, toDateRange } from "@/lib/date-range";

interface BodyMeasurementFilterBarProps {
  filter: BodyMeasurementFilter;
  onChange: (filter: BodyMeasurementFilter) => void;
}

const EMPTY_FILTER: BodyMeasurementFilter = {};

export function BodyMeasurementFilterBar({
  filter,
  onChange
}: BodyMeasurementFilterBarProps) {
  const t = useTranslations("body_measurement.filter");
  const { pending, setPending, isDirty, apply, clear } =
    useDeferredFilter<BodyMeasurementFilter>(filter, onChange);

  const hasActiveValues = !!(
    filter.startDate || filter.endDate ||
    pending.startDate || pending.endDate
  );

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 rounded-none border border-border p-4">
      <div className="flex items-center gap-2 h-10 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:self-end">
        <Filter className="size-5" aria-hidden="true" />
        <span>{t("label")}</span>
      </div>
      <div className="flex flex-col gap-1 flex-1 sm:max-w-[280px]">
        <label htmlFor="measurement-date-range" className="text-xs text-muted-foreground">
          {t("date_range")}
        </label>
        <DateRangePicker
          id="measurement-date-range"
          data-testid="measurement-date-range"
          value={toDateRange(pending)}
          placeholder={t("date_range_placeholder")}
          onChange={(range) =>
            setPending((prev) => ({ ...prev, ...fromDateRange(range) }))
          }
          className="w-full"
        />
      </div>
      <div className="flex items-center gap-2 sm:self-end">
        {hasActiveValues && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => clear(EMPTY_FILTER)}
          >
            <X className="mr-1 size-5" aria-hidden="true" />
            {t("clear")}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          disabled={!isDirty}
          onClick={apply}
        >
          {t("apply")}
        </Button>
      </div>
    </div>
  );
}
