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
export const API_URL = requireEnv(
  process.env.NEXT_PUBLIC_API_URL,
  'NEXT_PUBLIC_API_URL',
  'http://localhost:8080/api'
)
