"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { SIDEBAR_ITEM_SPACING } from "./dashboard-styles";
import { cn } from "@/lib/utils";
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
  const tTheme = useTranslations("common.theme");

  const sun = (
    <Sun className="size-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" aria-hidden="true" />
  );
  const moon = (
    <Moon className="size-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" aria-hidden="true" />
  );

  const menu = (
    <DropdownMenuContent align="end">
      <DropdownMenuItem className="text-sm! font-medium!" onClick={() => setTheme("light")}>
        {tTheme("light")}
      </DropdownMenuItem>
      <DropdownMenuItem className="text-sm! font-medium!" onClick={() => setTheme("dark")}>
        {tTheme("dark")}
      </DropdownMenuItem>
      <DropdownMenuItem className="text-sm! font-medium!" onClick={() => setTheme("system")}>
        {tTheme("system")}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  if (variant === "sidebar") {
    // The Sun and Moon are stacked layers inside a positioned 20px box in the
    // button variant, so they have to be `absolute`. The sidebar row is a flex
    // box of its own and swaps them with `dark:hidden` instead.
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <SidebarMenuButton
              tooltip={tTheme("label")}
              className={cn(SIDEBAR_ITEM_SPACING, "text-base! font-medium!")}
            />
          }
        >
          <span className="relative flex size-5 shrink-0 items-center justify-center">
            <span className="absolute dark:hidden">{sun}</span>
            <span className="absolute hidden dark:block">{moon}</span>
          </span>
          <span>{tTheme("label")}</span>
        </DropdownMenuTrigger>
        {menu}
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={tTheme("toggle")}
            title={tTheme("toggle")}
            className="font-medium!"
          >
            {/* The two icons are stacked, not laid out side by side: in flow
                they are two 20px flex items with `flex-shrink: 0`, which
                overflow the 36px square and push the visible sun icon outside
                the button (and outside its hover surface). Absolute layers
                over a 20px box keep the swap and the scale transition. */}
            <span className="relative flex size-5 shrink-0 items-center justify-center">
              <span className="absolute inset-0 flex items-center justify-center">
                {sun}
              </span>
              <span className="absolute inset-0 flex items-center justify-center">
                {moon}
              </span>
            </span>
            <span className="sr-only">{tTheme("toggle")}</span>
          </Button>
        }
      />
      {menu}
    </DropdownMenu>
  );
}
