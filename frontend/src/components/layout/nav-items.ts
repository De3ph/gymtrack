"use client";

import {
  ClipboardList,
  Dumbbell,
  LayoutDashboard,
  Library,
  Ruler,
  ShieldCheck,
  UserRound,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { ROUTES } from "@/lib/routes";

export type ActiveMatch = "exact" | "endsWith" | "includes";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** How `href` is compared against the current pathname to derive the active state. */
  activeMatch: ActiveMatch;
}

/**
 * Single source of truth for role-based navigation.
 *
 * The sidebar renders once — shadcn swaps it for a Sheet drawer below the `lg`
 * breakpoint — so every item must be present here. Previously the mobile drawer
 * kept its own hand-written copy of these lists and silently drifted (it was
 * missing the athlete "Measurements" link).
 */
export function useNavItems(userRole?: string): NavItem[] {
  const tNav = useTranslations("common.navigation");
  const tAthlete = useTranslations("athlete");
  const tTrainer = useTranslations("trainer");
  const tAdmin = useTranslations("admin.nav");

  switch (userRole) {
    case "athlete":
      return [
        {
          href: ROUTES.ATHLETE_WORKOUTS,
          label: tNav("workouts"),
          icon: Dumbbell,
          activeMatch: "endsWith",
        },
        {
          href: ROUTES.ATHLETE_MEALS,
          label: tNav("meals"),
          icon: Utensils,
          activeMatch: "endsWith",
        },
        {
          href: ROUTES.ATHLETE_MEASUREMENTS,
          label: tNav("measurements"),
          icon: Ruler,
          activeMatch: "endsWith",
        },
        {
          href: ROUTES.ATHLETE_TRAINERS,
          label: tAthlete("trainers.title"),
          icon: Users,
          activeMatch: "endsWith",
        },
        {
          href: ROUTES.ATHLETE_WORKOUT_PLANS,
          label: tNav("workout_plans"),
          icon: ClipboardList,
          activeMatch: "endsWith",
        },
        {
          href: ROUTES.EXERCISES,
          label: tNav("exercises"),
          icon: Library,
          activeMatch: "endsWith",
        },
      ];

    case "trainer":
      return [
        {
          href: ROUTES.TRAINER_CLIENTS,
          label: tTrainer("clients.title"),
          icon: Users,
          activeMatch: "endsWith",
        },
        {
          href: ROUTES.TRAINER_PROFILE,
          label: tNav("profile"),
          icon: UserRound,
          activeMatch: "endsWith",
        },
        {
          href: ROUTES.TRAINER_WORKOUT_PLANS,
          label: tNav("workout_plans"),
          icon: ClipboardList,
          activeMatch: "endsWith",
        },
        {
          href: ROUTES.EXERCISES,
          label: tNav("exercises"),
          icon: Library,
          activeMatch: "endsWith",
        },
      ];

    case "admin":
      return [
        {
          href: ROUTES.ADMIN_DASHBOARD,
          label: tAdmin("dashboard"),
          icon: LayoutDashboard,
          activeMatch: "endsWith",
        },
        {
          href: ROUTES.ADMIN_USERS,
          label: tAdmin("users"),
          icon: Users,
          activeMatch: "includes",
        },
        {
          href: ROUTES.ADMIN_MODERATION,
          label: tAdmin("moderation"),
          icon: ShieldCheck,
          activeMatch: "includes",
        },
        {
          href: ROUTES.ADMIN_PROFILE,
          label: tAdmin("profile"),
          icon: UserRound,
          activeMatch: "endsWith",
        },
      ];

    default:
      return [];
  }
}

/**
 * Resolve whether a nav item should render as active for the given pathname.
 *
 * Routes are locale-prefixed at runtime (`/en/athlete/workouts`), so a strict
 * equality check never matches — hence the suffix/substring strategies.
 */
export function isNavItemActive(
  pathname: string,
  item: Pick<NavItem, "href" | "activeMatch">
): boolean {
  switch (item.activeMatch) {
    case "exact":
      return pathname === item.href;
    case "endsWith":
      return pathname.endsWith(item.href);
    case "includes":
      return pathname.includes(item.href);
    default:
      return false;
  }
}
