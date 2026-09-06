import React, { createContext, useContext, useMemo } from "react";
import { getLocales } from "expo-localization";

// Direct JSON imports — use web's existing translations
import en from "../../messages/en.json";
import tr from "../../messages/tr.json";

const messages: Record<string, unknown> = { en, tr };
type Locale = "en" | "tr";

interface I18nContextValue {
  locale: Locale;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  t: (key: string) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const deviceLocale = getLocales()[0]?.languageCode ?? "en";
  const locale: Locale = deviceLocale === "tr" ? "tr" : "en";

  const value = useMemo(() => {
    const msg =
      (messages[locale] as Record<string, unknown> | undefined) ??
      (messages.en as Record<string, unknown>);
    return {
      locale,
      t: (key: string, params?: Record<string, string | number>) => {
        const keys = key.split(".");
        let result: unknown = msg;
        for (const k of keys) {
          if (typeof result !== "object" || result === null) return key;
          result = (result as Record<string, unknown>)[k];
        }
        if (typeof result !== "string") return key;
        if (!params) return result;
        return result.replace(/\{(\w+)\}/g, (match, name: string) =>
          params[name] != null ? String(params[name]) : match
        );
      },
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
