// DOM i18n — loads messages directly in webview context
import en from "../../../messages/en.json";
import tr from "../../../messages/tr.json";

const messages: Record<string, any> = { en, tr };

export function getDomT(locale: string = "en") {
  const msg = messages[locale] ?? messages.en;
  return (key: string): string => {
    const keys = key.split(".");
    let result: any = msg;
    for (const k of keys) {
      if (typeof result !== "object" || result === null) return key;
      result = result[k];
    }
    return typeof result === "string" ? result : key;
  };
}
