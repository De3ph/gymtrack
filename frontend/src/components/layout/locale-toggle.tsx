"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { SIDEBAR_ITEM_SPACING } from "./dashboard-styles";
import { cn } from "@/lib/utils";

const localeLabels: Record<string, string> = {
  en: "EN",
  tr: "TR",
};

type LocaleToggleProps = {
  /**
   * `"button"` is the compact trigger used by the auth and landing headers. It
   * carries a globe icon *and* the locale code, so it sizes to its content
   * instead of using the square `icon` button size — a fixed 36px box cannot
   * hold both without spilling the label outside the hover surface.
   * `"sidebar"` renders a full-width labelled row for the dashboard rail.
   * See {@link ThemeToggleProps.variant}.
   */
  variant?: "button" | "sidebar";
};

export function LocaleToggle({ variant = "button" }: LocaleToggleProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const tNav = useTranslations("common.navigation");
  const nextLocale = locale === "en" ? "tr" : "en";

  const handleToggle = () => {
    router.replace(pathname, { locale: nextLocale });
  };

  if (variant === "sidebar") {
    return (
      <SidebarMenuButton
        tooltip={tNav("language")}
        className={cn(SIDEBAR_ITEM_SPACING, "text-base! font-medium!")}
        onClick={handleToggle}
        aria-label={`${tNav("language")}: ${localeLabels[locale]} → ${localeLabels[nextLocale]}`}
      >
        <Globe aria-hidden="true" />
        <span>{tNav("language")}</span>
        {/* Right-aligned current locale code; hides with the label on collapse. */}
        <span className="ms-auto text-xs font-medium text-muted-foreground group-data-[collapsible=icon]:hidden">
          {localeLabels[locale]}
        </span>
      </SidebarMenuButton>
    );
  }

  return (
    <Button
      variant="ghost"
      onClick={handleToggle}
      title={`Switch to ${nextLocale === "en" ? "English" : "Turkish"}`}
      className="font-medium!"
    >
      <Globe className="size-5" aria-hidden="true" />
      <span className="text-sm font-medium">{localeLabels[locale]}</span>
      <span className="sr-only">Toggle language</span>
    </Button>
  );
}
