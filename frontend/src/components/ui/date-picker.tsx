"use client";

import * as React from "react";
import dayjs from "dayjs";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  onBlur?: () => void;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  required?: boolean;
  format?: string;
  ["data-testid"]?: string;
  ["aria-invalid"]?: boolean;
}

const DEFAULT_FORMAT = "MMM D, YYYY";
const DEFAULT_START_MONTH = dayjs().subtract(10, "year").startOf("month").toDate();
const DEFAULT_END_MONTH = dayjs().add(1, "year").endOf("month").toDate();

export function DatePicker({
  value,
  onChange,
  onBlur,
  placeholder = "Pick a date",
  id,
  className,
  disabled,
  minDate,
  maxDate,
  required,
  format = DEFAULT_FORMAT,
  "data-testid": dataTestId,
  "aria-invalid": ariaInvalid,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const triggerLabel = value
    ? dayjs(value).format(format)
    : placeholder;

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
        data-placeholder={!value}
        className={cn(
          "w-full",
          className,
        )}
        onBlur={onBlur}
        render={
          <Button
            variant="outline"
            type="button"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
            )}
          />
        }
      >
        <CalendarIcon data-icon="inline-start" />
        <span className="truncate">{triggerLabel}</span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            if (required && !date) {
              return;
            }
            onChange?.(date);
            setOpen(false);
          }}
          captionLayout="dropdown"
          disabled={disabledMatcher}
          startMonth={minDate ?? DEFAULT_START_MONTH}
          endMonth={maxDate ?? DEFAULT_END_MONTH}
          showOutsideDays={false}
        />
      </PopoverContent>
    </Popover>
  );
}
