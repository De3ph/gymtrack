'use client';

import { useRouter, usePathname } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

const localeNames = {
  en: 'English',
  tr: 'Türkçe',
} as const;

function getLocaleName(locale: string) {
  return localeNames[locale as keyof typeof localeNames] || locale;
}

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const switchLanguage = (newLocale: string) => {
    const pathnameWithoutLocale = pathname.replace(`/${locale}`, '') || '/';
    router.push(`/${newLocale}${pathnameWithoutLocale}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-none border border-border bg-background font-mono text-[10px] uppercase tracking-[0.18em] text-foreground shadow-none ring-0 outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-3.5"
      >
        <Globe className="size-3.5" aria-hidden="true" />
        <span>{getLocaleName(locale)}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="rounded-none border border-border bg-popover p-0 text-popover-foreground shadow-none ring-0"
      >
        {routing.locales.map((loc) => {
          const isActive = loc === locale;
          return (
            <DropdownMenuItem
              key={loc}
              onClick={() => switchLanguage(loc)}
              disabled={isActive}
              className={cn(
                'rounded-none border-b border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground last:border-b-0 focus:bg-muted focus:text-foreground data-[variant=default]:focus:**:text-foreground',
                isActive && 'bg-muted/50',
              )}
              aria-current={isActive ? 'true' : undefined}
            >
              <span aria-hidden="true">{isActive ? '●' : '○'}</span>
              <span>{getLocaleName(loc)}</span>
              <span className="ml-auto text-muted-foreground">{loc}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
