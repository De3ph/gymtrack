import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Geist_Mono, Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker-registrar";
import { Providers } from "./providers";
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500"],
  display: "swap",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GymTrack - Fitness Tracking for Trainers & Athletes",
  description: "Track workouts, meals, and progress with your personal trainer",
  applicationName: "GymTrack",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GymTrack",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
};

export async function generateStaticParams() {
  return [{ locale: "en" }, { locale: "tr" }];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <html lang={locale} className={cn(inter.variable, geistMono.variable)} suppressHydrationWarning>
      <head>
        <template
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var key = "theme";
                  var stored = localStorage.getItem(key) || "system";
                  var theme = stored === "system"
                    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
                    : stored;
                  if (theme === "dark") {
                    document.documentElement.classList.add("dark");
                    document.documentElement.style.colorScheme = "dark";
                  } else {
                    document.documentElement.classList.remove("dark");
                    document.documentElement.style.colorScheme = "light";
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ServiceWorkerRegistrar />
        <Suspense fallback={null}>
          <LocaleLayoutInner locale={locale}>{children}</LocaleLayoutInner>
        </Suspense>
      </body>
    </html>
  );
}

async function LocaleLayoutInner({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: string;
}) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Providers>{children}</Providers>
    </NextIntlClientProvider>
  );
}
