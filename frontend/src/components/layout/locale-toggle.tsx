"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

const localeLabels: Record<string, string> = {
  en: "EN",
  tr: "TR",
};

export function LocaleToggle() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const nextLocale = locale === "en" ? "tr" : "en";

  const handleToggle = () => {
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      title={`Switch to ${nextLocale === "en" ? "English" : "Turkish"}`}
      className="gap-1"
    >
      <Globe className="size-4" />
      <span className="text-xs font-semibold">{localeLabels[locale]}</span>
      <span className="sr-only">Toggle language</span>
    </Button>
  );
}
