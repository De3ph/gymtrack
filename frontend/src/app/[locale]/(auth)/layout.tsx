import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LocaleToggle } from "@/components/layout/locale-toggle";
import { ROUTES } from "@/lib/routes";

/** Ordered so the rail reads like a list of what the product tracks. */
const TRACK_KEYS = ["workouts", "nutrition", "measurements", "coaching"] as const;

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("auth.brand");

  return (
    <div className="relative flex min-h-screen bg-background">
      {/* Brand rail: carries the identity on wide screens. On narrow screens
          the same mark moves into the header below. */}
      <aside className="relative hidden w-[42%] max-w-[620px] flex-col justify-between overflow-hidden border-r border-border bg-foreground px-12 py-12 text-background lg:flex">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-10 select-none font-display text-[24rem] leading-none text-background/5"
        >
          GT
        </span>

        <Link
          href={ROUTES.HOME}
          className="relative flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-foreground"
        >
          <span className="flex size-11 items-center justify-center border border-background bg-background font-display text-lg font-medium text-foreground">
            GT
          </span>
          <span className="text-3xl font-medium tracking-tight">GymTrack</span>
        </Link>

        <div className="relative max-w-md">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-background/70">
            {t("eyebrow")}
          </p>
          <p className="mt-5 text-balance font-display text-4xl leading-[1.05]">
            {t("statement")}
          </p>

          <ul className="mt-10 border-t border-background/15">
            {TRACK_KEYS.map((key, index) => (
              <li
                key={key}
                className="flex items-baseline gap-4 border-b border-background/15 py-3"
              >
                <span
                  aria-hidden="true"
                  className="font-mono text-xs text-background/50"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-base font-medium">{t(`tracks.${key}`)}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative font-mono text-xs font-medium text-background/70">
          {t("note")}
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 px-6 py-6 lg:justify-end lg:px-16">
          <Link
            href={ROUTES.HOME}
            className="group flex items-center gap-2.5 lg:hidden"
            aria-label="GymTrack"
          >
            <span className="flex size-9 items-center justify-center border border-foreground bg-foreground font-display text-sm font-medium text-background transition-colors duration-200 group-hover:bg-background group-hover:text-foreground">
              GT
            </span>
            <span className="text-2xl font-medium text-foreground">GymTrack</span>
          </Link>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LocaleToggle />
          </div>
        </header>

        <main className="flex flex-1 items-center px-6 pb-16 pt-2 lg:px-16">
          <div className="w-full max-w-2xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
