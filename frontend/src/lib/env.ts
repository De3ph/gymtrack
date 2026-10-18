/**
 * Single validated environment module.
 *
 * Fails fast: in production a missing variable throws at startup (and at
 * build time, since server modules are executed during prerendering) instead
 * of silently pointing the app at a local default. In development the
 * documented localhost fallback keeps `pnpm dev` zero-config.
 *
 * Note: `NEXT_PUBLIC_*` variables must be read with a *static* member access
 * (`process.env.NEXT_PUBLIC_API_URL`) — Next.js inlines them at build time,
 * and dynamic lookups (`process.env[name]`) are NOT substituted in client
 * bundles.
 */

const isProduction = process.env.NODE_ENV === 'production'

/** Hosts exempt from the production https:// requirement (local smoke tests). */
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

function requireEnv(value: string | undefined, name: string, devFallback: string): string {
  if (value) return value

  if (isProduction) {
    throw new Error(
      `[env] ${name} is required in production but is not set. ` +
        `Set it in your deployment environment (see .env.example).`
    )
  }

  return devFallback
}

/** Base URL of the Go backend REST API (includes the `/api` suffix). */
export const API_URL = requireSecureUrl(
  requireEnv(
    process.env.NEXT_PUBLIC_API_URL,
    'NEXT_PUBLIC_API_URL',
    'http://localhost:8080/api'
  ),
  'NEXT_PUBLIC_API_URL'
)

/*
 * INTERNAL_API_URL is deliberately NOT declared here — see `./server-env`.
 * This module is pulled into the client bundle (lib/api/api-client.ts imports
 * API_URL), so a server-only variable placed here would be replaced with
 * `undefined` in the browser and its production check would throw on every
 * page load. Only NEXT_PUBLIC_* values are safe in this file.
 */

/**
 * Public origin of this web app (no trailing slash).
 *
 * Used for SEO absolutes — `metadataBase`, canonical URLs, `sitemap.xml` and
 * `robots.txt`. Like API_URL, a missing value in production would silently
 * produce localhost links in crawled output, so it fails fast instead.
 */
export const SITE_URL = requireSecureUrl(
  requireEnv(
    process.env.NEXT_PUBLIC_SITE_URL,
    'NEXT_PUBLIC_SITE_URL',
    'http://localhost:3000'
  ),
  'NEXT_PUBLIC_SITE_URL'
)

/**
 * Enforces the HTTPS contract of the production security headers.
 *
 * The production CSP appends `upgrade-insecure-requests`, which makes the
 * browser silently upgrade any http:// subresource — including API calls — to
 * https://. An absolute http:// URL in production therefore breaks against a
 * plain-HTTP backend (the upgraded request hits a TLS port that isn't there),
 * so fail fast at startup instead. Exemptions:
 *
 * - Relative values (`/api`) — same-origin behind the reverse proxy, TLS
 *   terminated there; no http:// subresource to upgrade.
 * - Loopback hosts (`localhost`, `127.0.0.1`, `[::1]`) — local smoke tests
 *   against a production build without TLS.
 */
function requireSecureUrl(value: string, name: string): string {
  if (!isProduction) return value

  let url: URL
  try {
    url = new URL(value)
  } catch {
    // Not absolute — relative path (e.g. "/api") is fine, anything else is a
    // misconfiguration.
    if (value.startsWith('/')) return value
    throw new Error(
      `[env] ${name} must be an absolute https:// URL or a path starting with "/".`
    )
  }

  if (url.protocol === 'http:' && !LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error(
      `[env] ${name} must use https:// in production (got "${value}"). ` +
        `The production CSP sends upgrade-insecure-requests, which rewrites ` +
        `http:// API calls to https:// and breaks a plain-HTTP backend. ` +
        `Terminate TLS at the reverse proxy and use a relative path, or ` +
        `publish the API over https://.`
    )
  }

  return value
}
