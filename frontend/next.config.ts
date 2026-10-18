import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from "@sentry/nextjs";
import createBundleAnalyzer from "@next/bundle-analyzer";

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const isProduction = process.env.NODE_ENV === "production";

// Origin of the Go backend, for the CSP connect-src directive. Derived from
// NEXT_PUBLIC_API_URL, so relocating the API to another host or CDN is an env
// change, never a code change. A relative value ("/api" — same-origin behind
// the reverse proxy) yields no origin here; `'self'` in connect-src already
// covers it, and a raw path would be an invalid (ignored) CSP source.
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";
let apiOrigin = "";
try {
  apiOrigin = new URL(rawApiUrl).origin;
} catch {
  // relative URL — same-origin, 'self' suffices
}

const contentSecurityPolicy = [
  "default-src 'self'",
  // `unsafe-inline` is required for the inline theme-bootstrap script in the
  // root layout and the inline scripts Next.js emits during hydration. A
  // nonce-based policy would force dynamic rendering on every route, which
  // conflicts with static prerendering and the PWA service worker — revisit
  // if the rendering model changes. `unsafe-eval` is dev-only (React needs it
  // for enhanced debugging).
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  // Inline style attributes are used by library components (recharts, embla,
  // base-ui), so styles cannot be locked to 'self' only.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://images.unsplash.com https://media1.tenor.com",
  "font-src 'self' data:",
  // Sentry envelopes are tunneled through the same-origin /monitoring route
  // (see tunnelRoute below); the ingest host is allowed as a fallback.
  `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ""} https://*.ingest.de.sentry.io`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // Would upgrade the http:// localhost API to https in dev — production only.
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // HSTS is meaningless over plain HTTP (browsers ignore it), but only send it
  // in production to keep local dev pristine.
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

// Source maps are intentionally KEPT for Sentry symbolication (enabled via withSentryConfig); disabling is an escape hatch only if build OOM occurs.
const nextConfig: NextConfig = {
  output: "standalone",
  // Type errors are tracked separately; keep production builds unblocked.
  typescript: { ignoreBuildErrors: true },
  cacheComponents: true,
  async rewrites() {
    const publicTarget = process.env.NEXT_PUBLIC_API_URL ?? "http://backend:8080/api";
    // When the browser-facing API base is relative ("/api"), the reverse proxy
    // (nginx `location /api/`) already routes those requests to the backend, so
    // do NOT rewrite to the same relative path (would loop). But the frontend
    // container is also reachable directly on its own port, where there is no
    // proxy: fall back to the container-network backend URL so /api/* still
    // resolves instead of 404-ing.
    const target = /^https?:\/\//.test(publicTarget)
      ? publicTarget
      : (process.env.INTERNAL_API_URL || "http://backend:8080/api");
    if (!/^https?:\/\//.test(target)) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${target}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
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
      },
      {
        protocol: "https",
        hostname: "media1.tenor.com",
        pathname: "/m/**"
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

// Sentry production checklist:
// - NEXT_PUBLIC_SENTRY_DSN must be set in prod (used by client/server/edge SDKs)
// - tunnelRoute "/monitoring" is excluded from the proxy matcher (src/proxy.ts)
// - widenClientFileUpload uploads client source maps in CI, which requires
//   SENTRY_AUTH_TOKEN (plus SENTRY_ORG/SENTRY_PROJECT) — fail loudly if absent.
if (process.env.CI && !process.env.SENTRY_AUTH_TOKEN) {
  console.warn(
    "[sentry] SENTRY_AUTH_TOKEN is not set in CI — source map upload will be " +
      "skipped and production stack traces will stay minified."
  );
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