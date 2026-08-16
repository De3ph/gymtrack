'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toast';
import { useState } from 'react';
import { STALE_TIMES } from '@/lib/api/api-constants';

declare global {
  interface Window {
    __TANSTACK_QUERY_CLIENT__:
    import("@tanstack/react-query").QueryClient;
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

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
