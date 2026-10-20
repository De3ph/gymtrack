"use client";

import * as React from "react";
import { Tabs, TabsPanel, TabsList, TabsTab } from "@/components/animate-ui/components/base/tabs";
import { ClientFilterBar } from "./ClientFilterBar";
import { WorkoutsTab } from "./WorkoutsTab";
import { MealsTab } from "./MealsTab";
import { ProgressTab } from "./ProgressTab";
import { MeasurementsTab } from "./MeasurementsTab";
import { ClientPlansTab } from "@/components/features/workout-plan/ClientPlansTab";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { WorkoutStats, MealStats } from "@/types";
import {
  hasActiveFilters,
  isHistoryTab,
  type ClientFilters,
  type ClientTab,
  type HistoryTab,
} from "./client-filters";

interface ClientTabsProps {
  activeTab: ClientTab;
  onTabChange: (value: string) => void;
  username: string;
  workoutStats: WorkoutStats | null;
  mealStats: MealStats | null;
  filters: ClientFilters;
  onFiltersChange: (filters: ClientFilters) => void;
}

type TabCounts = Record<HistoryTab, number | null>;

const EMPTY_COUNTS: TabCounts = { workouts: null, meals: null, measurements: null };

export function ClientTabs({
  activeTab,
  onTabChange,
  username,
  workoutStats,
  mealStats,
  filters,
  onFiltersChange,
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

  // The history tabs only care about the two date bounds; the type filters are
  // passed to the tab that consumes them.
  const dateRange = { start: filters.start, end: filters.end };

  // Each history tab reports the server-side total for its own query. The
  // panels are kept mounted so the totals are known without opening a tab.
  // Until the first response lands the badge shows a dash, not "0", so it
  // reads as pending rather than empty.
  const label = (tab: HistoryTab, text: string) => {
    const count = counts[tab];
    return `${text} (${count === null ? "—" : count})`;
  };

  // The bar is hidden rather than unmounted on Progress/Plans so a draft that
  // has not been applied yet survives the detour. It keeps asking for the last
  // history tab's type filter while hidden.
  const historyTab = isHistoryTab(activeTab) ? activeTab : null;
  const [lastHistoryTab, setLastHistoryTab] = React.useState<HistoryTab>("workouts");
  if (historyTab && historyTab !== lastHistoryTab) {
    setLastHistoryTab(historyTab);
  }

  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      {/* The tab labels carry counts and never truncate, so the list wraps on
          narrow screens instead of pushing the page sideways. */}
      <TabsList className="mb-4 flex h-auto min-h-9 w-full flex-wrap">
        <TabsTab value="workouts">{label("workouts", t("workouts"))}</TabsTab>
        <TabsTab value="meals">{label("meals", t("meals"))}</TabsTab>
        <TabsTab value="measurements">{label("measurements", t("measurements"))}</TabsTab>
        <TabsTab value="progress">{t("progress_charts")}</TabsTab>
        <TabsTab value="plans">{t("plans")}</TabsTab>
      </TabsList>

      {/* Filters shape the history tabs only, so the toolbar lives with them
          instead of taking a tab of its own. It stays put while the trainer
          moves between workouts, meals and measurements. */}
      <div className={cn("mb-4", !historyTab && "hidden")}>
        <ClientFilterBar
          activeTab={historyTab ?? lastHistoryTab}
          filters={filters}
          onChange={onFiltersChange}
        />
      </div>

      <TabsPanel
        transition={{ duration: 0.15, ease: "easeInOut" }}
        value="workouts"
        keepMounted
      >
        <WorkoutsTab
          username={username}
          dateRange={dateRange}
          exerciseType={filters.exerciseType}
          isFiltered={hasActiveFilters(filters, "workouts")}
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
          mealType={filters.mealType}
          isFiltered={hasActiveFilters(filters, "meals")}
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
          isFiltered={hasActiveFilters(filters, "measurements")}
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
