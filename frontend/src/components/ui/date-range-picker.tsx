"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import dayjs, { formatDate } from "@/lib/i18n/dayjs";
import { cn } from "@/lib/utils";

export interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  numberOfMonths?: number;
  format?: string;
  ["data-testid"]?: string;
  ["aria-invalid"]?: boolean;
}

const DEFAULT_FORMAT = "MMM D, YYYY";
const DEFAULT_START_MONTH = dayjs().subtract(10, "year").startOf("month").toDate();
const DEFAULT_END_MONTH = dayjs().add(1, "year").endOf("month").toDate();

/**
 * Range picker built from `Popover` + `Calendar mode="range"` (shadcn/ui).
 *
 * The popover stays open while the range is incomplete so the user can pick
 * the end date, and closes as soon as both ends are set so the surrounding
 * filter bar stays reachable.
 */
export function DateRangePicker({
  value,
  onChange,
  placeholder = "Pick a date range",
  id,
  className,
  disabled,
  minDate,
  maxDate,
  numberOfMonths = 2,
  format = DEFAULT_FORMAT,
  "data-testid": dataTestId,
  "aria-invalid": ariaInvalid,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const triggerLabel = React.useMemo(() => {
    const from = value?.from;
    const to = value?.to;
    if (!from) return placeholder;
    if (!to) return formatDate(from, format);
    return `${formatDate(from, format)} – ${formatDate(to, format)}`;
  }, [value, placeholder, format]);

  const disabledMatcher = React.useMemo(() => {
    const matchers: Array<{ before: Date } | { after: Date }> = [];
    if (minDate) matchers.push({ before: minDate });
    if (maxDate) matchers.push({ after: maxDate });
    return matchers.length > 0 ? matchers : undefined;
  }, [minDate, maxDate]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        data-testid={dataTestId}
        data-placeholder={!value?.from}
        className={cn(
          "w-full",
          className,
        )}
        render={
          <Button
            variant="outline"
            type="button"
            className={cn(
              "w-full justify-start text-left font-medium",
              !value?.from && "text-muted-foreground",
            )}
          />
        }
      >
        <CalendarIcon data-icon="inline-start" />
        <span className="truncate">{triggerLabel}</span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={value}
          onSelect={(range) => {
            onChange?.(range);
            if (range?.from && range?.to) {
              setOpen(false);
            }
          }}
          defaultMonth={value?.from}
          numberOfMonths={numberOfMonths}
          captionLayout="dropdown"
          disabled={disabledMatcher}
          startMonth={minDate ?? DEFAULT_START_MONTH}
          endMonth={maxDate ?? DEFAULT_END_MONTH}
          showOutsideDays={false}
          resetOnSelect
        />
      </PopoverContent>
    </Popover>
  );
}
