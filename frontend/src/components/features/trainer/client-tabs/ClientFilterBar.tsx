"use client";

import * as React from "react";
import dayjs from "dayjs";
import type { DateRange } from "react-day-picker";
import { Filter, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDeferredFilter } from "@/lib/hooks/use-deferred-filter";
import { cn } from "@/lib/utils";
import {
  EMPTY_CLIENT_FILTERS,
  MEAL_TYPES,
  activeFilterCount,
  type ClientFilters,
  type HistoryTab,
} from "./client-filters";

const ALL = "all";

const LABEL_CLASS =
  "font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground";

interface ClientFilterBarProps {
  activeTab: HistoryTab;
  filters: ClientFilters;
  onChange: (filters: ClientFilters) => void;
  className?: string;
}

/**
 * Shared filter toolbar for the client-detail history tabs.
 *
 * Filtering used to live in its own "Overview" tab: a tab promised a view but
 * only rendered a form, and the controls disappeared as soon as the trainer
 * opened the history they filtered. The bar now sits next to the tab list and
 * asks only for what the active tab can use — a date range (shared by all
 * history tabs) plus that tab's type filter.
 */
export function ClientFilterBar({
  activeTab,
  filters,
  onChange,
  className,
}: ClientFilterBarProps) {
  const t = useTranslations("trainer.client_detail.filters");
  const { pending, setPending, clear } = useDeferredFilter<ClientFilters>(
    filters,
    onChange,
  );

  // Only the fields the active tab shows can be drafted here. A hidden field
  // falls back to the value that is already applied, so a draft typed on
  // Workouts is never submitted from Meals, and Apply stays disabled while the
  // visible controls match what is applied. The draft itself is kept, so it is
  // still there when the trainer comes back to the tab that owns it.
  const scopeToTab = React.useCallback(
    (values: ClientFilters): ClientFilters => ({
      ...values,
      exerciseType:
        activeTab === "workouts" ? values.exerciseType : filters.exerciseType,
      mealType: activeTab === "meals" ? values.mealType : filters.mealType,
    }),
    [activeTab, filters.exerciseType, filters.mealType],
  );

  const scoped = scopeToTab(pending);
  const isDirty =
    scoped.start !== filters.start ||
    scoped.end !== filters.end ||
    scoped.exerciseType !== filters.exerciseType ||
    scoped.mealType !== filters.mealType;

  const apply = () => onChange(scoped);

  const appliedCount = activeFilterCount(filters, activeTab);
  const hasValues = activeFilterCount(scoped, activeTab) > 0;
  const hasDates = Boolean(pending.start || pending.end);

  const clearDates = () =>
    setPending((prev) => ({ ...prev, start: "", end: "" }));

  const dateRange = React.useMemo<DateRange | undefined>(() => {
    const from = pending.start ? dayjs(pending.start).toDate() : undefined;
    const to = pending.end ? dayjs(pending.end).toDate() : undefined;
    return from || to ? { from, to } : undefined;
  }, [pending.start, pending.end]);

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setPending((prev) => ({
      ...prev,
      start: range?.from ? dayjs(range.from).format("YYYY-MM-DD") : "",
      end: range?.to ? dayjs(range.to).format("YYYY-MM-DD") : "",
    }));
  };

  // Base UI's Select resolves the trigger label from `items`; the portalled
  // options do not exist while the popup is closed.
  const mealTypeItems = React.useMemo(
    () => [
      { value: ALL, label: t("all_meal_types") },
      ...MEAL_TYPES.map((mealType) => ({
        value: mealType,
        label: t(`meal_types.${mealType}`),
      })),
    ],
    [t],
  );

  return (
    <form
      aria-label={t("label")}
      onSubmit={(event) => {
        event.preventDefault();
        if (isDirty) apply();
      }}
      className={cn("border border-border", className)}
    >
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3 p-3">
        <div className="flex h-9 w-full items-center gap-2 sm:w-auto">
          <Filter className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className={LABEL_CLASS}>{t("label")}</span>
          <span
            aria-live="polite"
            aria-atomic="true"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground"
          >
            {appliedCount > 0 ? t("active_count", { count: appliedCount }) : null}
          </span>
        </div>

        <Field className="w-full sm:max-w-[260px]">
          <FieldLabel htmlFor="client-filter-date-range" className={LABEL_CLASS}>
            {t("date_range")}
          </FieldLabel>
          <div className="relative w-full">
            <DateRangePicker
              id="client-filter-date-range"
              data-testid="client-filter-date-range"
              value={dateRange}
              onChange={handleDateRangeChange}
              placeholder={t("date_range_placeholder")}
              className={cn("rounded-none", hasDates && "pr-9")}
            />
            {hasDates && (
              // The calendar can replace a range but not unset it; without
              // this the only way to drop dates is Clear, which also wipes the
              // type filter.
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={clearDates}
                aria-label={t("clear_dates")}
                className="absolute top-1/2 right-0 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden="true" />
              </Button>
            )}
          </div>
        </Field>

        {activeTab === "workouts" && (
          <Field className="w-full sm:max-w-[240px]">
            <FieldLabel htmlFor="client-filter-exercise-type" className={LABEL_CLASS}>
              {t("exercise_type")}
            </FieldLabel>
            <Input
              id="client-filter-exercise-type"
              type="search"
              autoComplete="off"
              value={pending.exerciseType}
              onChange={(event) =>
                setPending((prev) => ({
                  ...prev,
                  exerciseType: event.target.value,
                }))
              }
              placeholder={t("exercise_placeholder")}
              className="rounded-none"
            />
          </Field>
        )}

        {activeTab === "meals" && (
          <Field className="w-full sm:max-w-[220px]">
            <FieldLabel htmlFor="client-filter-meal-type" className={LABEL_CLASS}>
              {t("meal_type")}
            </FieldLabel>
            <Select
              items={mealTypeItems}
              value={pending.mealType || ALL}
              onValueChange={(next) =>
                setPending((prev) => ({
                  ...prev,
                  mealType: !next || next === ALL ? "" : next,
                }))
              }
            >
              <SelectTrigger
                id="client-filter-meal-type"
                className="w-full rounded-none shadow-none"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none border border-border shadow-none ring-0">
                {mealTypeItems.map((item) => (
                  <SelectItem
                    key={item.value}
                    value={item.value}
                    className="rounded-none font-mono text-[10px] uppercase tracking-[0.18em]"
                  >
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        <div className="flex w-full items-center justify-end gap-2 sm:ml-auto sm:w-auto">
          {hasValues && (
            <Button
              type="button"
              variant="outline"
              onClick={() => clear({ ...EMPTY_CLIENT_FILTERS })}
              className="rounded-none border-border font-mono text-[11px] uppercase tracking-[0.18em]"
            >
              <X className="size-4" aria-hidden="true" />
              {t("clear")}
            </Button>
          )}
          <Button
            type="submit"
            disabled={!isDirty}
            className="rounded-none font-mono text-[11px] uppercase tracking-[0.18em]"
          >
            {t("apply")}
          </Button>
        </div>
      </div>
    </form>
  );
}
