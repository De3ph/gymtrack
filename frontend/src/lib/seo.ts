import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/env";

/**
 * Shared SEO helpers for public-facing pages.
 *
 * `localePrefix: "as-needed"` (src/i18n/routing.ts) means the default locale
 * (`en`) is served from the root path and every other locale from `/{locale}`
 * — all helpers below encode that rule so sitemap/robots/canonical output
 * stays consistent.
 */

/** Absolute origin of the deployed app, no trailing slash. */
export const siteUrl = SITE_URL;

/** Resolve a path (e.g. "/about") to its locale-specific path. */
export function localizedPath(path: string, locale: string): string {
  if (locale === routing.defaultLocale) return path;
  return `/${locale}${path === "/" ? "" : path}`;
}

/** Absolute, locale-aware URL for a public path. */
export function absoluteUrl(path: string, locale: string = routing.defaultLocale): string {
  return new URL(localizedPath(path, locale), siteUrl).toString();
}

/** All locales as `hreflang` entries plus `x-default` pointing at the default. */
export function languageAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = absoluteUrl(path, locale);
  }
  languages["x-default"] = absoluteUrl(path, routing.defaultLocale);
  return languages;
}

/**
 * Canonical + hreflang block for a public page. Child `alternates` replace the
 * parent's wholesale, so pages should spread the whole result.
 */
export function pageAlternates(path: string, locale: string): Metadata["alternates"] {
  return {
    canonical: absoluteUrl(path, locale),
    languages: languageAlternates(path),
  };
}

/** Default social-share image (2400×1600, see public/images). */
const OG_IMAGE = {
  url: "/images/hero-training.jpg",
  width: 2400,
  height: 1600,
  alt: "GymTrack — athlete training with a coach",
};

/**
 * OpenGraph + Twitter block for a public page.
 *
 * Next.js replaces a nested metadata object (e.g. `openGraph`) instead of
 * merging it with the parent's, so every page that sets any OG field must
 * repeat siteName/images here — hence the helper.
 */
export function pageSocialMetadata(options: {
  title: string;
  description: string;
  path: string;
  locale: string;
  type?: "website" | "profile";
}): Pick<Metadata, "openGraph" | "twitter"> {
  const { title, description, path, locale, type = "website" } = options;
  return {
    openGraph: {
      type,
      siteName: "GymTrack",
      title,
      description,
      url: absoluteUrl(path, locale),
      locale: locale === "tr" ? "tr_TR" : "en_US",
      alternateLocale: locale === "tr" ? "en_US" : "tr_TR",
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE.url],
    },
  };
}
