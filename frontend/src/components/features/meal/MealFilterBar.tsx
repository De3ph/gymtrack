"use client";

import dayjs from "dayjs";
import { Filter, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { useTranslations } from "next-intl";
import type { MealFilter } from "./MealList";
import { useDeferredFilter } from "@/lib/hooks/use-deferred-filter";

interface MealFilterBarProps {
  filter: MealFilter;
  onChange: (filter: MealFilter) => void;
}

const EMPTY_FILTER: MealFilter = {};

export function MealFilterBar({
  filter,
  onChange
}: MealFilterBarProps) {
  const t = useTranslations("meal.filter");
  const { pending, setPending, isDirty, apply, clear } =
    useDeferredFilter<MealFilter>(filter, onChange);

  const hasActiveValues = !!(
    filter.startDate || filter.endDate ||
    pending.startDate || pending.endDate
  );

  return (
    <div className="flex flex-col gap-3 border border-border p-3 sm:flex-row sm:flex-wrap sm:items-end rounded-none">
      <div className="flex h-10 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:self-end">
        <Filter className="size-5" aria-hidden="true" />
        <span>{t("label")}</span>
      </div>
      <div className="flex flex-1 flex-col space-y-1 sm:max-w-[180px]">
        <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {t("start_date")}
        </label>
        <DatePicker
          data-testid="meal-start-date"
          value={pending.startDate ? new Date(pending.startDate) : undefined}
          maxDate={pending.endDate ? new Date(pending.endDate) : undefined}
          onChange={(d) =>
            setPending({
              ...pending,
              startDate: d ? dayjs(d).startOf("day").toISOString() : undefined,
            })
          }
          className="w-full"
        />
      </div>
      <div className="flex flex-1 flex-col space-y-1 sm:max-w-[180px]">
        <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {t("end_date")}
        </label>
        <DatePicker
          data-testid="meal-end-date"
          value={pending.endDate ? new Date(pending.endDate) : undefined}
          minDate={pending.startDate ? new Date(pending.startDate) : undefined}
          onChange={(d) =>
            setPending({
              ...pending,
              endDate: d ? dayjs(d).endOf("day").toISOString() : undefined,
            })
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
            className="rounded-none font-mono text-xs uppercase tracking-[0.18em]"
          >
            <X className="size-5" aria-hidden="true" />
            {t("clear")}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          disabled={!isDirty}
          onClick={apply}
          className="rounded-none font-mono text-xs uppercase tracking-[0.18em]"
        >
          {t("apply")}
        </Button>
      </div>
    </div>
  );
}
