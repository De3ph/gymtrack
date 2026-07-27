"use client";

import { Menu } from "lucide-react";
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
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">{tCommon("toggle_menu")}</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-full w-3/4 max-w-sm">
        <DrawerHeader className="border-b">
          <DrawerTitle className="text-left">
            <Link
              href={ROUTES.DASHBOARD}
              className={linkStyles.brand}
              onClick={() => {
                // Close handled by link navigation
              }}
            >
              GymTrack
            </Link>
          </DrawerTitle>
        </DrawerHeader>
        <nav className="flex flex-col gap-1 p-4">
          {userRole === "athlete" && <AthleteNavLinks />}
          {userRole === "trainer" && <TrainerNavLinks />}
          {userRole === "admin" && <AdminNavLinks />}
        </nav>
        <div className="mt-auto border-t p-4">
          <div className="mb-3 flex items-center justify-center gap-2">
            <ThemeToggle />
            <LocaleToggle />
          </div>
          <div className="mb-3 flex items-center justify-center gap-3">
            <Avatar>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{userName}</span>
          </div>
          <DrawerClose asChild>
            <Button onClick={onLogout} variant="secondary" className="w-full">
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
