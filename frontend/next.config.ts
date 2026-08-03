import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from "@sentry/nextjs";
import createBundleAnalyzer from "@next/bundle-analyzer";

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// Source maps are intentionally KEPT for Sentry symbolication (enabled via withSentryConfig); disabling is an escape hatch only if build OOM occurs.
const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**"
      }
    ]
  },
  experimental: {
    webpackMemoryOptimizations: true
  }
}

export default withBundleAnalyzer(
  withSentryConfig(
    withNextIntl(nextConfig),
    {
      // Upload wider set of client source files for better stack trace resolution
      widenClientFileUpload: true,

      // Create a proxy API route to bypass ad-blockers
      tunnelRoute: "/monitoring",

      // Suppress non-CI output
      silent: !process.env.CI,
    },
  ),
);