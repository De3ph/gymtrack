import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  /* config options here */
}

export default withSentryConfig(
  withNextIntl(nextConfig),
  {
    // Upload wider set of client source files for better stack trace resolution
    widenClientFileUpload: true,

    // Create a proxy API route to bypass ad-blockers
    tunnelRoute: "/monitoring",

    // Suppress non-CI output
    silent: !process.env.CI,
  },
);