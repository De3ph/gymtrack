import type { Metadata } from "next";
import Link from "next/link";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { StatusScreen } from "@/components/features/StatusScreen";
import { ThemeBootScript } from "@/components/layout/theme-boot-script";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import "./globals.css";

/**
 * 404 page for URLs that match no route. Next skips the app tree for these,
 * so this file ships its own styles, fonts and theme bootstrap. English only:
 * the i18n provider lives in the layout, which is not rendered here.
 */

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-barlow-condensed",
});
const barlow = Barlow({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Page not found | GymTrack",
  description: "The page does not exist or has moved.",
};

export default function GlobalNotFound() {
  return (
    <html lang="en" className={cn(barlow.variable, barlowCondensed.variable)} suppressHydrationWarning>
      <head>
        <ThemeBootScript />
      </head>
      <body className="antialiased">
        <StatusScreen
          code="404"
          kicker="Not found"
          title="Page not found"
          description="The link points to a page that does not exist or has moved. Check the link, or go back to the home page."
          actions={
            <Link
              href="/"
              className={buttonVariants({
                variant: "default",
                className:
                  "rounded-none font-mono text-xs uppercase tracking-[0.18em]",
              })}
            >
              Home
            </Link>
          }
        />
      </body>
    </html>
  );
}
