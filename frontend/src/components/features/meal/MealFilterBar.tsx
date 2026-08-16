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
    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 p-3 rounded-md border bg-card">
      <div className="flex items-center gap-2 h-10 text-sm font-medium text-muted-foreground sm:self-end">
        <Filter className="h-4 w-4" />
        <span>{t("label")}</span>
      </div>
      <div className="flex flex-col space-y-1 flex-1 sm:max-w-[180px]">
        <label className="text-xs text-muted-foreground">
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
      <div className="flex flex-col space-y-1 flex-1 sm:max-w-[180px]">
        <label className="text-xs text-muted-foreground">
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
          >
            <X className="mr-1 h-4 w-4" />
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
