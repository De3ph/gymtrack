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
  // cacheComponents enables prerender-phase source maps by default; they cost
  // extra memory during "Generating static pages". Sentry's source maps are
  // unaffected — this only skips the prerender phase.
  enablePrerenderSourceMaps: false,
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
    webpackMemoryOptimizations: true,
    // withSentryConfig injects a custom webpack config, which turns OFF the
    // auto-enabled build worker (default: enabled only when webpack config is
    // not customized). Re-enable it to compile in a separate process with its
    // own heap, reducing main-process memory during builds.
    webpackBuildWorker: true,
    // Don't preload every page's JS modules at server start — trades slightly
    // slower first hits for a smaller baseline memory footprint.
    preloadEntriesOnStart: false,
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