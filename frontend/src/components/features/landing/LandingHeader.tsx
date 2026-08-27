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
        className="group flex items-center gap-3 font-mono text-xs uppercase tracking-[0.18em]"
      >
        <span className="flex size-9 items-center justify-center border border-foreground bg-foreground text-background transition group-hover:bg-background group-hover:text-foreground">
          GT
        </span>
        <span className="hidden flex-col leading-tight sm:flex">
          <span className="font-semibold text-foreground">{t("title")}</span>
          <span className="text-[10px] text-muted-foreground">
            {t("eyebrow")}
          </span>
        </span>
      </Link>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <LocaleToggle />
      </div>
    </header>
  );
}
