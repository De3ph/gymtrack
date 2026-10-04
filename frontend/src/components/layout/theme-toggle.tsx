"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { SIDEBAR_ITEM_SPACING } from "./dashboard-styles";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ThemeToggleProps = {
  /**
   * `"button"` is the compact square trigger used by the auth and landing
   * headers. `"sidebar"` renders a full-width labelled row for the dashboard
   * rail, where an icon-only square button would be ambiguous once the label is
   * hidden on collapse.
   */
  variant?: "button" | "sidebar";
};

export function ThemeToggle({ variant = "button" }: ThemeToggleProps) {
  const { setTheme } = useTheme();
  const tNav = useTranslations("common.navigation");

  const sun = (
    <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" aria-hidden="true" />
  );
  const moon = (
    <Moon className="h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" aria-hidden="true" />
  );

  if (variant === "sidebar") {
    // The Moon is stacked over the Sun via `absolute` in the button variant,
    // which needs a positioned parent. The sidebar row is a flex box, so the
    // icons swap in flow instead.
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <SidebarMenuButton tooltip={tNav("theme")} className={SIDEBAR_ITEM_SPACING} />
          }
        >
          <span className="relative flex size-5 shrink-0 items-center justify-center">
            <span className="absolute dark:hidden">{sun}</span>
            <span className="absolute hidden dark:block">{moon}</span>
          </span>
          <span>{tNav("theme")}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme("light")}>
            Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            System
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon">
            {sun}
            {moon}
            <span className="sr-only">Toggle theme</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
