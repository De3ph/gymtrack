"use client";

import { useLocale } from "next-intl";
import { enUS, tr, type Locale } from "react-day-picker/locale";

/**
 * Map next-intl locales to react-day-picker date-fns locales. Day and month
 * names (including the month dropdown) come from these objects; an unknown
 * locale falls back to English.
 */
const RDP_LOCALES: Record<string, Locale> = { en: enUS, tr };

/**
 * Resolve the react-day-picker `Locale` for the active next-intl locale.
 * `explicit` wins so callers can always force a specific locale.
 */
export const useDatePickerLocale = (explicit?: Partial<Locale>): Locale => {
  const locale = useLocale();
  // DayPicker's `locale` prop is typed `Partial<Locale>` but callers that pin
  // one always pass a complete date-fns locale object.
  return (explicit as Locale | undefined) ?? RDP_LOCALES[locale] ?? enUS;
};
