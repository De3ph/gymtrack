"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { linkStyles } from "./dashboard-styles";
import { ROUTES } from "@/lib/routes";

/**
 * Top bar for the dashboard shell.
 *
 * Holds only the burger trigger (which drives the shadcn Sheet below `lg` and
 * collapses the rail above it) plus the wordmark shown below `lg`. Role
 * navigation, the appearance toggles, and the profile/logout actions all live in
 * the sidebar so there is exactly one of each.
 */
export function DashboardHeader() {
  const tNav = useTranslations("common.navigation");

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 sm:px-6">
      {/* Burger — doubles as the rail collapse toggle at lg and up. */}
      <SidebarTrigger aria-label={tNav("toggle_menu")} />

      {/* The sidebar owns the wordmark from lg up, where the rail is visible. */}
      <Link
        href={ROUTES.DASHBOARD}
        className={`${linkStyles.brand} lg:hidden`}
        aria-label="GymTrack Dashboard"
      >
        GymTrack
      </Link>
    </header>
  );
}
