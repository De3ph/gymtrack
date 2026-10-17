"use client";

import * as React from "react";
import { Tabs, TabsPanel, TabsList, TabsTab } from "@/components/animate-ui/components/base/tabs";
import { OverviewTab } from "./OverviewTab";
import { WorkoutsTab } from "./WorkoutsTab";
import { MealsTab } from "./MealsTab";
import { ProgressTab } from "./ProgressTab";
import { MeasurementsTab } from "./MeasurementsTab";
import { ClientPlansTab } from "@/components/features/workout-plan/ClientPlansTab";
import { useTranslations } from "next-intl";
import { WorkoutStats, MealStats } from "@/types";

interface ClientTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  username: string;
  workoutStats: WorkoutStats | null;
  mealStats: MealStats | null;
  dateRange: { start: string; end: string };
  exerciseType: string;
  mealType: string;
  onDateRangeChange: (range: { start: string; end: string }) => void;
  onExerciseTypeChange: (type: string) => void;
  onMealTypeChange: (type: string) => void;
  onClearFilters: () => void;
}

type HistoryTab = "workouts" | "meals" | "measurements";

type TabCounts = Record<HistoryTab, number | null>;

const EMPTY_COUNTS: TabCounts = { workouts: null, meals: null, measurements: null };

export function ClientTabs({
  activeTab,
  onTabChange,
  username,
  workoutStats,
  mealStats,
  dateRange,
  exerciseType,
  mealType,
  onDateRangeChange,
  onExerciseTypeChange,
  onMealTypeChange,
  onClearFilters,
}: ClientTabsProps) {
  const t = useTranslations("trainer.client_detail.tabs");

  const [counts, setCounts] = React.useState<TabCounts>(EMPTY_COUNTS);

  const reportCount = React.useCallback(
    (tab: HistoryTab, count: number | null) => {
      setCounts((prev) => (prev[tab] === count ? prev : { ...prev, [tab]: count }));
    },
    [],
  );

  // Children report only their server-side total; the tab name is bound here.
  const onWorkoutCount = React.useCallback(
    (count: number | null) => reportCount("workouts", count),
    [reportCount],
  );
  const onMealCount = React.useCallback(
    (count: number | null) => reportCount("meals", count),
    [reportCount],
  );
  const onMeasurementCount = React.useCallback(
    (count: number | null) => reportCount("measurements", count),
    [reportCount],
  );

  // Each history tab reports the server-side total for its own query. The
  // panels are kept mounted so the totals are known without opening a tab.
  // Until the first response lands the badge shows a dash, not "0", so it
  // reads as pending rather than empty.
  const label = (tab: HistoryTab, text: string) => {
    const count = counts[tab];
    return `${text} (${count === null ? "—" : count})`;
  };

  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList className="mb-4 flex-wrap">
        <TabsTab value="overview">{t("overview")}</TabsTab>
        <TabsTab value="workouts">{label("workouts", t("workouts"))}</TabsTab>
        <TabsTab value="meals">{label("meals", t("meals"))}</TabsTab>
        <TabsTab value="measurements">{label("measurements", t("measurements"))}</TabsTab>
        <TabsTab value="progress">{t("progress_charts")}</TabsTab>
        <TabsTab value="plans">{t("plans")}</TabsTab>
      </TabsList>

      <TabsPanel transition={{ duration: 0.15, ease: "easeInOut" }} value="overview">
        <OverviewTab
          dateRange={dateRange}
          exerciseType={exerciseType}
          mealType={mealType}
          onDateRangeChange={onDateRangeChange}
          onExerciseTypeChange={onExerciseTypeChange}
          onMealTypeChange={onMealTypeChange}
          onClearFilters={onClearFilters}
        />
      </TabsPanel>

      <TabsPanel
        transition={{ duration: 0.15, ease: "easeInOut" }}
        value="workouts"
        keepMounted
      >
        <WorkoutsTab
          username={username}
          dateRange={dateRange}
          exerciseType={exerciseType}
          onCountChange={onWorkoutCount}
        />
      </TabsPanel>

      <TabsPanel
        transition={{ duration: 0.15, ease: "easeInOut" }}
        value="meals"
        keepMounted
      >
        <MealsTab
          username={username}
          dateRange={dateRange}
          mealType={mealType}
          onCountChange={onMealCount}
        />
      </TabsPanel>

      <TabsPanel
        transition={{ duration: 0.15, ease: "easeInOut" }}
        value="measurements"
        keepMounted
      >
        <MeasurementsTab
          username={username}
          dateRange={dateRange}
          onCountChange={onMeasurementCount}
        />
      </TabsPanel>

      <TabsPanel transition={{ duration: 0.15, ease: "easeInOut" }} value="progress">
        <ProgressTab workoutStats={workoutStats} mealStats={mealStats} />
      </TabsPanel>

      <TabsPanel transition={{ duration: 0.15, ease: "easeInOut" }} value="plans">
        <ClientPlansTab />
      </TabsPanel>
    </Tabs>
  );
}
