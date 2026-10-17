import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pageAlternates, pageSocialMetadata } from "@/lib/seo";
import { AboutClient } from "./AboutClient";

const ABOUT_PATH = "/about";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about.metadata" });
  const title = t("title");
  const description = t("description");
  return {
    title,
    description,
    alternates: pageAlternates(ABOUT_PATH, locale),
    ...pageSocialMetadata({ title, description, path: ABOUT_PATH, locale }),
  };
}

export default function AboutPage() {
  return <AboutClient />;
}
