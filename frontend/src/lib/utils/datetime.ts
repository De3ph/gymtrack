import dayjs from "dayjs";

/**
 * Combine a Date object and a "HH:mm" time string into a single ISO-8601
 * timestamp.  The resulting date keeps the calendar day from `date` and
 * applies the hours/minutes from `time`; seconds and milliseconds are zeroed.
 */
export const combineDateTime = (date: Date, time: string): string => {
  const [hours, minutes] = time.split(":").map(Number);
  return dayjs(date)
    .hour(hours)
    .minute(minutes)
    .second(0)
    .millisecond(0)
    .toISOString();
};
