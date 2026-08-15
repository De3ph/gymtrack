"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROUTES } from "@/lib/routes";

interface UserAvatarMenuProps {
  userName?: string;
  userRole?: string;
  onLogout: () => void;
}

export function UserAvatarMenu({
  userName,
  userRole,
  onLogout,
}: UserAvatarMenuProps) {
  const tCommon = useTranslations("common.navigation");

  const initials =
    userName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  const profileHref =
    userRole === "admin" ? ROUTES.ADMIN_PROFILE : ROUTES.PROFILE;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button 
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all duration-200"
            aria-label={`User menu for ${userName || 'user'}`}
          >
            <Avatar className="h-9 w-9 transition-transform duration-200 hover:scale-105">
              <AvatarFallback className="text-sm font-medium">{initials}</AvatarFallback>
            </Avatar>
          </button>
        }
      />
      <DropdownMenuContent align="end" sideOffset={8} className="w-48">
        <DropdownMenuItem render={<Link href={profileHref} />}>
          <User className="mr-2 h-4 w-4" />
          {tCommon("profile")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} variant="destructive">
          <LogOut className="mr-2 h-4 w-4" />
          {tCommon("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}