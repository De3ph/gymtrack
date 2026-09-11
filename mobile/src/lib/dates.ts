import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

export function toDateString(d: Date): string {
  return dayjs(d).format("YYYY-MM-DD");
}

export function todayString(): string {
  return dayjs().format("YYYY-MM-DD");
}

/**
 * Parse a `YYYY-MM-DD` string (or an ISO timestamp starting with one)
 * into a local Date. Returns null when unparseable.
 */
export function parseDateString(s: string): Date | null {
  const prefix = /^\d{4}-\d{2}-\d{2}/.exec(s.trim());
  if (!prefix) return null;
  const d = dayjs(prefix[0], "YYYY-MM-DD", true);
  return d.isValid() ? d.toDate() : null;
}
