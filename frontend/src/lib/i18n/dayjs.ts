import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import localeData from "dayjs/plugin/localeData";

// Install essential plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localeData);

// Default locale - will be sync'd with next-intl locale
let currentLocale = "en";

// Initialize with SSR locale if available
// This is called from the provider to set the initial locale
export const initializeDayjsLocale = async (locale: string) => {
  currentLocale = locale;
  await import(`dayjs/locale/${locale}`);
  dayjs.locale(locale);
};

// Get the current dayjs instance with the synced locale
export const getDayjs = () => dayjs();

// Get the current locale
export const getCurrentLocale = () => currentLocale;

// Format a date with the current locale
export const formatDate = (
  date: Date | string | number,
  format: string = "MMM D, YYYY",
): string => {
  return dayjs(date).locale(currentLocale).format(format);
};

// Get locale-specific month names
export const getMonthNames = () => {
  return dayjs.localeData().months();
};

// Get locale-specific day names
export const getDayNames = () => {
  return dayjs.localeData().weekdays();
};

export default dayjs;
