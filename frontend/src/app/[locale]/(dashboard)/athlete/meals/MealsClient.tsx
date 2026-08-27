"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab =
    tabParam === "list" || tabParam === "calendar" ? tabParam : "log";
  const t = useTranslations("athlete.meals");

  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "log") {
        params.delete("tab");
      } else {
        params.set("tab", value);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="font-mono text-3xl font-semibold leading-none tracking-[-0.04em] text-foreground">
          {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <Tabs
        className="w-full"
        onValueChange={handleTabChange}
        value={activeTab}
      >
        <TabsList className="grid w-full grid-cols-3 mb-2" variant="line">
          <TabsTrigger value="log">{t("log_tab")}</TabsTrigger>
          <TabsTrigger value="list">{t("list_tab")}</TabsTrigger>
          <TabsTrigger value="calendar">{t("calendar_tab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="log">
          <div className="max-w-2xl">
            <Card className="rounded-none border border-border shadow-none ring-0">
              <CardHeader className="rounded-none border-b border-border">
                <CardTitle className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {t("card_title")}
                </CardTitle>
                <CardDescription>{t("card_description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <MealForm onSuccess={() => handleTabChange("list")} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="list">
          <MealList />
        </TabsContent>

        <TabsContent value="calendar">
          <MealCalendar />
        </TabsContent>
      </Tabs>
    </div>
  );
}
