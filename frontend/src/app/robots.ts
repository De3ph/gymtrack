import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { absoluteUrl } from "@/lib/seo";

/**
 * Authenticated surfaces that must never be crawled. Paths are matched as
 * prefixes, and both the default-locale (unprefixed) and localized
 * (`/{locale}/…`) variants are emitted because `localePrefix` is "as-needed".
 */
const DISALLOWED_PREFIXES = [
  "/athlete", // athlete dashboard + logs
  "/trainer", // trainer dashboard + clients
  "/admin", // admin panel
  "/dashboard", // role-agnostic landing after login
  "/profile",
  "/exercises", // requires a session
  "/api", // backend-proxied endpoints
  "/monitoring", // Sentry tunnel route
];

export default function robots(): MetadataRoute.Robots {
  const disallow = DISALLOWED_PREFIXES.flatMap((prefix) =>
    routing.locales
      .filter((locale) => locale !== routing.defaultLocale)
      .map((locale) => `/${locale}${prefix}`)
      .concat(prefix),
  );

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow,
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
