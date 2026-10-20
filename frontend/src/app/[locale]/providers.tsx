"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toast";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { STALE_TIMES } from "@/lib/api/api-constants";
import { initializeDayjsLocale } from "@/lib/i18n/dayjs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionExpiredDialog } from "@/components/features/auth/session-expired-dialog";

declare global {
  interface Window {
    __TANSTACK_QUERY_CLIENT__: import("@tanstack/react-query").QueryClient;
    /** Client-side navigate callback exposed so authStore can router.push
     *  (no full page reload) on auth errors. */
    __NAVIGATE__?: (to: string) => void;
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

  const router = useRouter();

  // Expose a client-side navigate function on window so authStore.handleAuthError
  // can router.push to login instead of doing a full page reload (which would
  // drop React Query cache). Mirrors how window.__TANSTACK_QUERY_CLIENT__ exposes
  // the query client to non-component code.
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__NAVIGATE__ = (to: string) => router.push(to);
    }
  }, [router]);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {children}
          {/* Mounted app-wide: the session can expire on any page. */}
          <SessionExpiredDialog />
        </TooltipProvider>
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
