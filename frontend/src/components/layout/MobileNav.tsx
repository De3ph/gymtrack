"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "./theme-toggle";
import { LocaleToggle } from "./locale-toggle";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { linkStyles } from "./dashboard-styles";
import { ROUTES } from "@/lib/routes";

interface MobileNavProps {
  userRole?: string;
  userName?: string;
  onLogout: () => void;
}

export function MobileNav({ userRole, userName, onLogout }: MobileNavProps) {
  const tCommon = useTranslations("common.navigation");

  const initials =
    userName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden"
          aria-label={tCommon("toggle_menu")}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-full w-3/4 max-w-sm">
        <DrawerHeader className="border-b px-6 py-4">
          <DrawerTitle className="flex items-center justify-between">
            <Link
              href={ROUTES.DASHBOARD}
              className={linkStyles.brand}
            >
              GymTrack
            </Link>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" aria-label="Close menu">
                <X className="h-5 w-5" />
              </Button>
            </DrawerClose>
          </DrawerTitle>
        </DrawerHeader>
        
        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-4 py-4" aria-label="Mobile navigation">
          <div className="flex flex-col gap-1">
            {userRole === "athlete" && <AthleteNavLinks />}
            {userRole === "trainer" && <TrainerNavLinks />}
            {userRole === "admin" && <AdminNavLinks />}
          </div>
        </nav>

        {/* Footer Actions */}
        <div className="border-t px-6 py-4">
          {/* User Info */}
          <div className="mb-4 flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="text-sm">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-foreground">{userName}</span>
          </div>

          {/* Theme and Locale toggles */}
          <div className="mb-4 flex items-center justify-center gap-2">
            <ThemeToggle />
            <LocaleToggle />
          </div>

          {/* Logout Button */}
          <DrawerClose asChild>
            <Button 
              onClick={onLogout} 
              variant="secondary" 
              className="w-full"
            >
              {tCommon("logout")}
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/* Wrappers that close the drawer on link click */
function AthleteNavLinks() {
  const tNav = useTranslations("common.navigation");
  const tAthlete = useTranslations("athlete");

  return (
    <>
      <DrawerClose asChild>
        <Link href={ROUTES.ATHLETE_WORKOUTS} className={linkStyles.nav}>
          {tNav("workouts")}
        </Link>
      </DrawerClose>
      <DrawerClose asChild>
        <Link href={ROUTES.ATHLETE_MEALS} className={linkStyles.nav}>
          {tNav("meals")}
        </Link>
      </DrawerClose>
      <DrawerClose asChild>
        <Link href={ROUTES.ATHLETE_TRAINERS} className={linkStyles.nav}>
          {tAthlete("trainers.title")}
        </Link>
      </DrawerClose>
      <DrawerClose asChild>
        <Link href={ROUTES.ATHLETE_WORKOUT_PLANS} className={linkStyles.nav}>
          {tNav("workout_plans")}
        </Link>
      </DrawerClose>
    </>
  );
}

function AdminNavLinks() {
  return (
    <>
      <DrawerClose asChild>
        <Link href={ROUTES.ADMIN_DASHBOARD} className={linkStyles.nav}>
          Dashboard
        </Link>
      </DrawerClose>
      <DrawerClose asChild>
        <Link href={ROUTES.ADMIN_USERS} className={linkStyles.nav}>
          Users
        </Link>
      </DrawerClose>
      <DrawerClose asChild>
        <Link href={ROUTES.ADMIN_PROFILE} className={linkStyles.nav}>
          Profile
        </Link>
      </DrawerClose>
    </>
  );
}

function TrainerNavLinks() {
  const tNav = useTranslations("common.navigation");
  const tTrainer = useTranslations("trainer");

  return (
    <>
      <DrawerClose asChild>
        <Link href={ROUTES.TRAINER_CLIENTS} className={linkStyles.nav}>
          {tTrainer("clients.title")}
        </Link>
      </DrawerClose>
      <DrawerClose asChild>
        <Link href={ROUTES.TRAINER_PROFILE} className={linkStyles.nav}>
          {tNav("profile")}
        </Link>
      </DrawerClose>
      <DrawerClose asChild>
        <Link href={ROUTES.TRAINER_WORKOUT_PLANS} className={linkStyles.nav}>
          {tNav("workout_plans")}
        </Link>
      </DrawerClose>
    </>
  );
}
