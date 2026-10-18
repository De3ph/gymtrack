import 'server-only'
import { API_URL } from '@/lib/env'

/**
 * Server-only environment.
 *
 * `env.ts` cannot hold these: it is imported by client code
 * (`lib/api/api-client.ts` → every `lib/api/*` module), so a *server-only*
 * variable declared there is statically replaced with `undefined` in the
 * browser bundle — and since `NODE_ENV` is inlined as `"production"`, its
 * production check then throws on every page load:
 *
 *   Error: [env] INTERNAL_API_URL is required in production but is not set.
 *
 * The `import 'server-only'` above turns that mistake into a build error
 * instead of a broken bundle.
 */
const isProduction = process.env.NODE_ENV === 'production'

/**
 * Server-only base URL of the Go backend, for server components and route
 * handlers whose `fetch()` requires an absolute URL (a relative "/api" throws
 * "Failed to parse URL" outside the browser).
 *
 * - Explicit `INTERNAL_API_URL` always wins (compose: http://backend:8080/api
 *   over the container network).
 * - Otherwise an absolute API_URL is reused as-is.
 * - Otherwise (API_URL is the same-origin relative "/api") INTERNAL_API_URL is
 *   required in production and falls back to localhost in development.
 */
export const INTERNAL_API_URL = ((): string => {
  const explicit = process.env.INTERNAL_API_URL
  if (explicit) return explicit
  if (!API_URL.startsWith('/')) return API_URL

  if (isProduction) {
    throw new Error(
      `[env] INTERNAL_API_URL is required in production but is not set. ` +
        `Set it in your deployment environment (see .env.example).`
    )
  }

  return 'http://localhost:8080/api'
})()
