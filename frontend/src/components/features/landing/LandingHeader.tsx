import { Dumbbell } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/routes";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LocaleToggle } from "@/components/layout/locale-toggle";

export function LandingHeader() {
  const t = useTranslations("home");

  return (
    <header className="flex items-center justify-between gap-4">
      <Link href={ROUTES.HOME} className="group flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-card shadow-sm transition group-hover:border-primary/60">
          <Dumbbell className="size-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-foreground">
            {t("title")}
          </p>
          <p className="-mt-0.5 text-xs font-medium text-muted-foreground">
            {t("eyebrow")}
          </p>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <LocaleToggle />
      </div>
    </header>
  );
}
