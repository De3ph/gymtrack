import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { absoluteUrl, languageAlternates } from "@/lib/seo";

/**
 * Public, indexable pages. Login/register are included so search results land
 * on the right entry point; dashboard surfaces are deliberately absent (and
 * disallowed in robots.ts).
 */
const PUBLIC_PATHS = [
  { path: "/", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/about", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/login", changeFrequency: "yearly" as const, priority: 0.5 },
  { path: "/register", changeFrequency: "yearly" as const, priority: 0.5 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_PATHS.flatMap(({ path, changeFrequency, priority }) =>
    routing.locales.map((locale) => ({
      url: absoluteUrl(path, locale),
      lastModified,
      changeFrequency,
      priority,
      alternates: {
        languages: languageAlternates(path),
      },
    })),
  );
}
