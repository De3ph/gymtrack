"use client";

import dayjs from "dayjs";
import { Filter, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldLabel } from "@/components/ui/field";
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
  onChange,
}: WorkoutFilterBarProps) {
  const t = useTranslations("workout.filter");
  const { pending, setPending, isDirty, apply, clear } =
    useDeferredFilter<WorkoutFilter>(filter, onChange);

  const hasActiveValues = Boolean(
    filter.startDate ||
      filter.endDate ||
      pending.startDate ||
      pending.endDate,
  );

  return (
    <div className="flex flex-col gap-3 border border-border p-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="flex items-center gap-2 text-muted-foreground sm:self-end">
        <Filter className="size-4" aria-hidden="true" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
          {t("label")}
        </span>
      </div>

      <Field className="flex-1 sm:max-w-[180px]">
        <FieldLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {t("start_date")}
        </FieldLabel>
        <DatePicker
          data-testid="workout-start-date"
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
      </Field>

      <Field className="flex-1 sm:max-w-[180px]">
        <FieldLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {t("end_date")}
        </FieldLabel>
        <DatePicker
          data-testid="workout-end-date"
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
      </Field>

      <div className="flex items-center gap-2 sm:self-end">
        {hasActiveValues && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => clear(EMPTY_FILTER)}
            className="rounded-none font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" aria-hidden="true" />
            {t("clear")}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          disabled={!isDirty}
          onClick={apply}
          className="rounded-none font-mono text-[10px] uppercase tracking-[0.18em]"
        >
          {t("apply")}
        </Button>
      </div>
    </div>
  );
}
