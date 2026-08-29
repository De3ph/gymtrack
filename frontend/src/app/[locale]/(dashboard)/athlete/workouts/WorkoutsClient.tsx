"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Tabs,
  TabsPanel,
  TabsList,
  TabsTab,
} from "@/components/animate-ui/components/base/tabs";

import { WorkoutForm } from "@/components/features/workout/WorkoutForm";
import { WorkoutList } from "@/components/features/workout/WorkoutList";
import { WorkoutCalendar } from "@/components/features/workout/WorkoutCalendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { Workout } from "@/types";

interface WorkoutsClientProps {
  initialWorkout?: Workout;
  planId: string | null;
}

export function WorkoutsClient({
  initialWorkout,
  planId,
}: WorkoutsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab =
    tabParam === "list" || tabParam === "calendar" ? tabParam : "log";
  const t = useTranslations("athlete.workouts");

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
    [pathname, router, searchParams],
  );

  const handleClear = () => {
    if (planId) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("planId");
      router.push(`${pathname}?${params.toString()}`);
    }
  };

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
        <TabsList className="grid w-full grid-cols-3 mb-2">
          <TabsTab className="text-foreground" value="log">{t("log_tab")}</TabsTab>
          <TabsTab className="text-foreground" value="list">{t("list_tab")}</TabsTab>
          <TabsTab className="text-foreground" value="calendar">{t("calendar_tab")}</TabsTab>
        </TabsList>

        <TabsPanel transition={{ duration: 0.15, ease: "easeInOut" }} value="log">
          <div className="max-w-2xl">
            <Card className="rounded-none border border-border shadow-none ring-0">
              <CardHeader className="rounded-none border-b border-border">
                <CardTitle className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-foreground">
                  {t("card_title")}
                </CardTitle>
                <CardDescription>{t("card_description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <WorkoutForm
                  key={planId || "default"}
                  workout={initialWorkout}
                  onSuccess={() => handleTabChange("list")}
                  onClear={handleClear}
                />
              </CardContent>
            </Card>
          </div>
        </TabsPanel>

        <TabsPanel transition={{ duration: 0.15, ease: "easeInOut" }} value="list">
          <WorkoutList />
        </TabsPanel>

        <TabsPanel transition={{ duration: 0.15, ease: "easeInOut" }} value="calendar">
          <WorkoutCalendar />
        </TabsPanel>
      </Tabs>
    </div>
  );
}
