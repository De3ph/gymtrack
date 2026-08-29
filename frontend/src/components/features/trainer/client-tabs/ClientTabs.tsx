"use client";

import { Tabs, TabsPanel, TabsList, TabsTab } from "@/components/animate-ui/components/base/tabs";
import { OverviewTab } from "./OverviewTab";
import { WorkoutsTab } from "./WorkoutsTab";
import { MealsTab } from "./MealsTab";
import { ProgressTab } from "./ProgressTab";
import { MeasurementsTab } from "./MeasurementsTab";
import { ClientPlansTab } from "@/components/features/workout-plan/ClientPlansTab";
import { useTranslations } from "next-intl";
import { Workout, Meal, BodyMeasurement } from "@/types";
import { WorkoutStats, MealStats } from "@/types";

interface ClientTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  workouts: Workout[];
  meals: Meal[];
  measurements: BodyMeasurement[];
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

export function ClientTabs({
  activeTab,
  onTabChange,
  workouts,
  meals,
  measurements,
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

  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList className="mb-4 flex-wrap">
        <TabsTab value="overview">{t("overview")}</TabsTab>
        <TabsTab value="workouts">
          {t("workouts")} ({workouts.length})
        </TabsTab>
        <TabsTab value="meals">
          {t("meals")} ({meals.length})
        </TabsTab>
        <TabsTab value="measurements">
          {t("measurements")} ({measurements.length})
        </TabsTab>
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

      <TabsPanel transition={{ duration: 0.15, ease: "easeInOut" }} value="workouts">
        <WorkoutsTab workouts={workouts} />
      </TabsPanel>

      <TabsPanel transition={{ duration: 0.15, ease: "easeInOut" }} value="meals">
        <MealsTab meals={meals} />
      </TabsPanel>

      <TabsPanel transition={{ duration: 0.15, ease: "easeInOut" }} value="measurements">
        <MeasurementsTab measurements={measurements} />
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
