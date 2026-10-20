import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Geist_Mono, Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { SITE_URL } from "@/lib/env";
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker-registrar";
import { ThemeBootScript } from "@/components/layout/theme-boot-script";
import { Providers } from "./providers";
import "../globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});
const geistMono = Geist_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist-mono",
  display: "swap",
});

const SITE_TITLE = "GymTrack - Fitness Tracking for Trainers & Athletes";
const SITE_DESCRIPTION =
  "Track workouts, meals, and progress with your personal trainer";

export const metadata: Metadata = {
  // Absolute base so relative OG image URLs ("/images/...") resolve to
  // absolute URLs in crawlers' <meta> tags. Without it Next cannot
  // construct og:image URLs in production.
  metadataBase: new URL(SITE_URL),
  // Absolute base for metadata images, canonicals, sitemap/robots links.
  title: {
    default: SITE_TITLE,
    // Public pages set a bare title and inherit "<title> | GymTrack".
    template: "%s | GymTrack",
  },
  description: SITE_DESCRIPTION,
  applicationName: "GymTrack",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GymTrack",
  },
  formatDetection: { telephone: false },
  // Pages that override any OG field must restate siteName/images (Next
  // replaces nested metadata objects instead of merging) — see pageSocialMetadata.
  openGraph: {
    type: "website",
    siteName: "GymTrack",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/images/hero-training.jpg",
        width: 2400,
        height: 1600,
        alt: "GymTrack — athlete training with a coach",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/images/hero-training.jpg"],
  },
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
        <ThemeBootScript />
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
