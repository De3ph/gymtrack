import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/routes";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LocaleToggle } from "@/components/layout/locale-toggle";

export function LandingHeader() {
  const t = useTranslations("home");

  return (
    <header className="flex items-center justify-between gap-4">
      <Link
        href={ROUTES.HOME}
        className="group flex items-center gap-3"
      >
        <span className="flex size-9 items-center justify-center border border-foreground bg-foreground text-background transition group-hover:bg-background group-hover:text-foreground">
          GT
        </span>
        <span className="hidden flex-col sm:flex">
          <span className="text-2xl font-medium text-foreground">{t("title")}</span>
        </span>
      </Link>

      <div className="flex items-center gap-1">
        <Link
          href={ROUTES.ABOUT}
          className="hidden h-9 items-center px-3 text-base font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
        >
          {t("about")}
        </Link>
        <ThemeToggle />
        <LocaleToggle />
      </div>
    </header>
  );
}
