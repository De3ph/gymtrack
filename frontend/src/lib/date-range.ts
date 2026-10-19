import dayjs from "dayjs";
import type { DateRange } from "react-day-picker";

/**
 * Date range filters are kept as ISO strings so they can be sent straight to
 * the API and cached in query keys.
 */
export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

/**
 * Convert a stored filter into the range shape the calendar expects.
 * Returns `undefined` when no bound is set so the picker shows its
 * placeholder.
 */
export function toDateRange(filter: DateRangeFilter): DateRange | undefined {
  const from = filter.startDate ? new Date(filter.startDate) : undefined;
  const to = filter.endDate ? new Date(filter.endDate) : undefined;
  if (!from && !to) return undefined;
  return { from, to };
}

/**
 * Convert a calendar range back into the stored filter shape. The end bound
 * covers the whole day so a range filter matches every entry on the last day.
 */
export function fromDateRange(range: DateRange | undefined): DateRangeFilter {
  return {
    startDate: range?.from
      ? dayjs(range.from).startOf("day").toISOString()
      : undefined,
    endDate: range?.to ? dayjs(range.to).endOf("day").toISOString() : undefined,
  };
}
