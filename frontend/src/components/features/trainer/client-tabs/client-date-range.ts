import dayjs from "dayjs";

/**
 * Converts the trainer client-detail date filter (plain `YYYY-MM-DD` inputs
 * from OverviewTab) into the RFC3339 range the backend expects, widening to
 * the whole day so the end date is inclusive.
 */
export function toClientDateRange(range: { start: string; end: string }) {
  return {
    startDate: range.start
      ? dayjs(range.start).startOf("day").toISOString()
      : undefined,
    endDate: range.end ? dayjs(range.end).endOf("day").toISOString() : undefined,
  };
}
