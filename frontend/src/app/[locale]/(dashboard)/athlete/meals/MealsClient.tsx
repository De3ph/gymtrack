"use client";

import { useCallback, useState } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import {
  Tabs,
  TabsPanel,
  TabsList,
  TabsTab,
} from "@/components/animate-ui/components/base/tabs";

import { MealForm } from "@/components/features/meal/MealForm";
import { MealList } from "@/components/features/meal/MealList";
import { MealCalendar } from "@/components/features/meal/MealCalendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";

export default function MealsClient() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"log" | "list" | "calendar">(() => {
    const tabParam = searchParams.get("tab");
    return tabParam === "list" || tabParam === "calendar" ? tabParam : "log";
  });
  const t = useTranslations("athlete.meals");

  const handleTabChange = useCallback(
    (value: string) => {
      const next = value === "list" || value === "calendar" ? value : "log";
      setActiveTab(next);
      // Update the URL without triggering a Next.js navigation/re-render,
      // which was causing the tab animation to lag.
      const params = new URLSearchParams(window.location.search);
      if (next === "log") {
        params.delete("tab");
      } else {
        params.set("tab", next);
      }
      const qs = params.toString();
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname]
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="font-mono text-3xl font-semibold leading-none tracking-[-0.04em] text-foreground">
          {t("title")}
        </h1>
      </div>

      <Tabs
        className="w-full"
        onValueChange={handleTabChange}
        value={activeTab}
      >
        <TabsList className="grid w-full grid-cols-3 mb-2">
          <TabsTab value="log">{t("log_tab")}</TabsTab>
          <TabsTab value="list">{t("list_tab")}</TabsTab>
          <TabsTab value="calendar">{t("calendar_tab")}</TabsTab>
        </TabsList>

        <TabsPanel transition={{ duration: 0.15, ease: "easeInOut" }} value="log">
          <div className="max-w-2xl">
            <Card className="rounded-none border border-border shadow-none ring-0">
              <CardContent>
                <MealForm onSuccess={() => handleTabChange("list")} />
              </CardContent>
            </Card>
          </div>
        </TabsPanel>

        <TabsPanel transition={{ duration: 0.15, ease: "easeInOut" }} value="list">
          <MealList />
        </TabsPanel>

        <TabsPanel transition={{ duration: 0.15, ease: "easeInOut" }} value="calendar">
          <MealCalendar />
        </TabsPanel>
      </Tabs>
    </div>
  );
}
