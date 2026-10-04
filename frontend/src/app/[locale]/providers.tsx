"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toast";
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { STALE_TIMES } from "@/lib/api/api-constants";
import { initializeDayjsLocale } from "@/lib/i18n/dayjs";
import { TooltipProvider } from "@/components/ui/tooltip";

declare global {
  interface Window {
    __TANSTACK_QUERY_CLIENT__: import("@tanstack/react-query").QueryClient;
    __NEXT_INTL_LOCALE?: string;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: STALE_TIMES.FIVE_MINUTES,
          gcTime: STALE_TIMES.TEN_MINUTES, // (formerly cacheTime)
          retry: 1,
        },
      },
    });
    if (typeof window !== "undefined") {
      window.__TANSTACK_QUERY_CLIENT__ = client;
    }
    return client;
  });

  // Initialize dayjs locale on client side
  // The locale is set by next-intl and stored on window for cross-component access
  const locale = useLocale();

  useEffect(() => {
    if (locale) {
      initializeDayjsLocale(locale);
    }
  }, [locale]);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
