"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOut, UserRound } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavItems, isNavItemActive } from "./nav-items";
import { SIDEBAR_ITEM_SPACING } from "./dashboard-styles";
import { ThemeToggle } from "./theme-toggle";
import { LocaleToggle } from "./locale-toggle";
import { usePendingCoachingRequestsCount } from "@/hooks/use-pending-coaching-requests";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  userRole?: string;
  userName?: string;
  onLogout: () => void;
}

/**
 * Selected row: the app's single accent fill (`--sidebar-primary`, orange),
 * the same hue the primary buttons use, so "where am I" matches "what can I
 * press". The shadcn base paints active rows with `--sidebar-accent`
 * (stone-100), which is near-invisible against the stone-50 rail.
 *
 * The hover/active repeats keep the fill stable: the base `hover:bg-sidebar-accent`
 * would otherwise repaint an active row on mouse-down.
 */
const ACTIVE_NAV_ROW = [
  "data-active:bg-sidebar-primary",
  "data-active:text-sidebar-primary-foreground",
  "data-active:font-semibold!",
  "data-active:hover:bg-sidebar-primary",
  "data-active:hover:text-sidebar-primary-foreground",
  "data-active:active:bg-sidebar-primary",
];

/**
 * Count pill (or failure marker) for a nav row.
 *
 * Decorative: the count/failure is folded into the link's accessible name, so
 * this stays `aria-hidden`.
 *
 * On the selected row the pill inverts (accent fill behind it), so it needs its
 * own colors: foreground-on-primary on the primary fill.
 */
function NavBadge({
  count,
  failed,
  active,
}: {
  count: number;
  failed: boolean;
  active: boolean;
}) {
  if (count > 0) {
    return (
      <SidebarMenuBadge
        aria-hidden="true"
        className={cn(
          "rounded-full px-1.5 text-xs! font-medium!",
          active
            ? "bg-sidebar-primary-foreground text-sidebar-primary!"
            : "bg-primary text-primary-foreground!"
        )}
      >
        {count > 99 ? "99+" : count}
      </SidebarMenuBadge>
    );
  }

  if (!failed) return null;

  return (
    <SidebarMenuBadge
      aria-hidden="true"
      className={cn(
        "rounded-full px-1.5 text-xs! font-medium!",
        active
          ? "bg-sidebar-primary-foreground text-sidebar-primary!"
          : "bg-muted text-muted-foreground!"
      )}
    >
      !
    </SidebarMenuBadge>
  );
}

/** Initials for the avatar fallback, e.g. "Ada Lovelace" -> "AL". */
function getInitials(userName?: string): string {
  return (
    userName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

export function AppSidebar({ userRole, userName, onLogout }: AppSidebarProps) {
  const tNav = useTranslations("common.navigation");
  const pathname = usePathname();
  const items = useNavItems(userRole);
  const pendingRequests = usePendingCoachingRequestsCount(
    userRole === "trainer"
  );
  const { isMobile, setOpenMobile } = useSidebar();

  const profileHref =
    userRole === "admin" ? ROUTES.ADMIN_PROFILE : ROUTES.PROFILE;

  /** Close the mobile drawer after navigating so the sheet doesn't linger. */
  const closeMobileOnNavigate = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="GymTrack"
              className="h-11 px-3"
              render={
                <Link
                  href={ROUTES.DASHBOARD}
                  aria-label="GymTrack Dashboard"
                  onClick={closeMobileOnNavigate}
                />
              }
            >
              {/* The rail collapses to icons, so the wordmark hides on collapse
                  and the aria-label above carries the accessible name. */}
              <span
                className="truncate text-2xl font-medium group-data-[collapsible=icon]:hidden"
                aria-hidden="true"
              >
                GymTrack
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="py-4">
          <SidebarGroupLabel className="text-base! font-medium!">
            {tNav("menu")}
          </SidebarGroupLabel>
          <SidebarMenu className="space-y-1">
            {items.map((item) => {
              const isActive = isNavItemActive(pathname, item);
              const Icon = item.icon;
              // Only the trainer's Requests row carries a live count.
              const isRequestsItem = item.href === ROUTES.TRAINER_REQUESTS;
              const badgeCount = isRequestsItem ? pendingRequests.count : 0;
              const badgeFailed = isRequestsItem && pendingRequests.isError;
              // The pill is decorative, so the count (or the failure) lives in
              // the link's accessible name instead of adding an extra child.
              const accessibleLabel =
                badgeCount > 0
                  ? `${item.label}, ${tNav("pending_requests", {
                      count: badgeCount,
                    })}`
                  : badgeFailed
                    ? `${item.label}, ${tNav("pending_requests_unknown")}`
                    : undefined;

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive}
                    // Collapsed to icons the badge is hidden, so fold the count
                    // into the tooltip to keep the signal reachable.
                    tooltip={
                      badgeCount > 0
                        ? `${item.label} (${badgeCount})`
                        : item.label
                    }
                    className={cn(
                      SIDEBAR_ITEM_SPACING,
                      "text-base! font-medium!",
                      isActive && ACTIVE_NAV_ROW,
                      (badgeCount > 0 || badgeFailed) && "pr-10"
                    )}
                    aria-current={isActive ? "page" : undefined}
                    render={
                      <Link
                        href={item.href}
                        onClick={closeMobileOnNavigate}
                        aria-label={accessibleLabel}
                      />
                    }
                  >
                    <Icon aria-hidden="true" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                  <NavBadge
                    count={badgeCount}
                    failed={badgeFailed}
                    active={isActive}
                  />
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {/* Appearance controls live in the rail so the header carries only the
            burger and the wordmark. */}
        <SidebarMenu>
          <SidebarMenuItem>
            <ThemeToggle variant="sidebar" />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <LocaleToggle variant="sidebar" />
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarSeparator />

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={tNav("profile")}
              className={cn(SIDEBAR_ITEM_SPACING, "text-base! font-medium!")}
              render={
                <Link href={profileHref} onClick={closeMobileOnNavigate} />
              }
            >
              {/* Avatar stands in for the icon so the rail still reads as the
                  signed-in user when it collapses. */}
              {userName ? (
                <Avatar className="size-5 shrink-0">
                  <AvatarFallback className="text-xs! font-medium!">
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <UserRound aria-hidden="true" />
              )}
              <span className="truncate">{userName ?? tNav("profile")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={tNav("logout")}
              className={cn(SIDEBAR_ITEM_SPACING, "text-base! font-medium!")}
              onClick={onLogout}
            >
              <LogOut aria-hidden="true" />
              <span>{tNav("logout")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
