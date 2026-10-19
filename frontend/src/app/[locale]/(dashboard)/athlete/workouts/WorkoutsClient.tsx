"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Tabs,
  TabsPanel,
  TabsList,
  TabsTab,
} from "@/components/animate-ui/components/base/tabs";

import { WorkoutForm } from "@/components/features/workout/WorkoutForm";
import { WorkoutList } from "@/components/features/workout/WorkoutList";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { useTranslations } from "next-intl";
import { WorkoutPlan } from "@/types";

// react-day-picker only ships when the athlete opens the calendar tab.
const WorkoutCalendar = dynamic(
  () =>
    import("@/components/features/workout/WorkoutCalendar").then(
      (m) => m.WorkoutCalendar,
    ),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full" /> },
);

interface WorkoutsClientProps {
  initialPlan?: WorkoutPlan;
  initialPlanName?: string | null;
  planId: string | null;
}

export function WorkoutsClient({
  initialPlan,
  initialPlanName,
  planId,
}: WorkoutsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"log" | "list" | "calendar">(() => {
    const tabParam = searchParams.get("tab");
    return tabParam === "list" || tabParam === "calendar" ? tabParam : "log";
  });
  const t = useTranslations("athlete.workouts");
  const tForm = useTranslations("workout.form");

  // Confirm a plan that arrived via ?planId= (the "Log Workout" button on a
  // plan card). Those exercises are seeded server-side, so the form simply
  // appears filled in — nothing signals that a plan was applied.
  //
  // This lives here rather than in WorkoutForm because TabsPanel defaults to
  // keepMounted={false}: the form unmounts when the athlete switches tabs and
  // remounts with fresh state on return, so an effect inside it would re-toast
  // every time they came back to the Log tab. This component survives tab
  // switches, and only remounts on real navigation — so it fires once per
  // plan, which is exactly the intent.
  useEffect(() => {
    if (!planId || !initialPlanName) return;
    toast.add({
      type: "success",
      title: tForm("plan.loaded_title"),
      description: tForm("plan.loaded", { name: initialPlanName }),
    });
  }, [planId, initialPlanName, tForm]);

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
      window.history.replaceState(
        null,
        "",
        qs ? `${pathname}?${qs}` : pathname,
      );
    },
    [pathname],
  );

  const handleClear = () => {
    if (planId) {
      const params = new URLSearchParams(window.location.search);
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
                <WorkoutForm
                  key={planId || "default"}
                  plan={initialPlan}
                  loadedPlanName={initialPlanName}
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
