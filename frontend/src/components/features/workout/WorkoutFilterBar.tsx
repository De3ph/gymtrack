"use client";

import dayjs from "dayjs";
import { Filter, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DATE_FORMATS } from "@/lib/constants";
import { useTranslations } from "next-intl";
import type { WorkoutFilter } from "./WorkoutList";
import { useDeferredFilter } from "@/lib/hooks/use-deferred-filter";

interface WorkoutFilterBarProps {
  filter: WorkoutFilter;
  onChange: (filter: WorkoutFilter) => void;
}

const EMPTY_FILTER: WorkoutFilter = {};

export function WorkoutFilterBar({
  filter,
  onChange
}: WorkoutFilterBarProps) {
  const t = useTranslations("workout.filter");
  const { pending, setPending, isDirty, apply, clear } =
    useDeferredFilter<WorkoutFilter>(filter, onChange);

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
        <Input
          type="date"
          value={
            pending.startDate
              ? dayjs(pending.startDate).format(DATE_FORMATS.DATE_ONLY)
              : ""
          }
          max={
            pending.endDate
              ? dayjs(pending.endDate).format(DATE_FORMATS.DATE_ONLY)
              : undefined
          }
          onChange={(e) =>
            setPending({
              ...pending,
              startDate: e.target.value
                ? dayjs(e.target.value).startOf("day").toISOString()
                : undefined
            })
          }
        />
      </div>
      <div className="flex flex-col space-y-1 flex-1 sm:max-w-[180px]">
        <label className="text-xs text-muted-foreground">
          {t("end_date")}
        </label>
        <Input
          type="date"
          value={
            pending.endDate
              ? dayjs(pending.endDate).format(DATE_FORMATS.DATE_ONLY)
              : ""
          }
          min={
            pending.startDate
              ? dayjs(pending.startDate).format(DATE_FORMATS.DATE_ONLY)
              : undefined
          }
          onChange={(e) =>
            setPending({
              ...pending,
              endDate: e.target.value
                ? dayjs(e.target.value).endOf("day").toISOString()
                : undefined
            })
          }
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