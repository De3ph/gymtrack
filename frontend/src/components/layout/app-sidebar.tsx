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
import { ROUTES } from "@/lib/routes";

interface AppSidebarProps {
  userRole?: string;
  userName?: string;
  onLogout: () => void;
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
                className="truncate text-xl font-medium tracking-[-0.04em] group-data-[collapsible=icon]:hidden"
                aria-hidden="true"
              >
                GymTrack
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="py-1">
          <SidebarGroupLabel>{tNav("menu")}</SidebarGroupLabel>
          <SidebarMenu>
            {items.map((item) => {
              const isActive = isNavItemActive(pathname, item);
              const Icon = item.icon;

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={item.label}
                    className={SIDEBAR_ITEM_SPACING}
                    aria-current={isActive ? "page" : undefined}
                    render={
                      <Link
                        href={item.href}
                        onClick={closeMobileOnNavigate}
                      />
                    }
                  >
                    <Icon aria-hidden="true" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
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
              className={SIDEBAR_ITEM_SPACING}
              render={
                <Link href={profileHref} onClick={closeMobileOnNavigate} />
              }
            >
              {/* Avatar stands in for the icon so the rail still reads as the
                  signed-in user when it collapses. */}
              {userName ? (
                <Avatar className="size-5 shrink-0">
                  <AvatarFallback className="text-[10px] font-medium">
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
              className={SIDEBAR_ITEM_SPACING}
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
