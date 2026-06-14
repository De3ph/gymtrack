"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "./OverviewTab";
import { WorkoutsTab } from "./WorkoutsTab";
import { MealsTab } from "./MealsTab";
import { ProgressTab } from "./ProgressTab";
import { MeasurementsTab } from "./MeasurementsTab";
import { ClientPlansTab } from "@/components/features/workout-plan/ClientPlansTab";
import { useTranslations } from "next-intl";
import { Workout, Meal, BodyMeasurement } from "@/types";
import { WorkoutStats, MealStats } from "@/lib/api/api-types";

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
        <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
        <TabsTrigger value="workouts">
          {t("workouts")} ({workouts.length})
        </TabsTrigger>
        <TabsTrigger value="meals">
          {t("meals")} ({meals.length})
        </TabsTrigger>
        <TabsTrigger value="measurements">
          {t("measurements")} ({measurements.length})
        </TabsTrigger>
        <TabsTrigger value="progress">{t("progress_charts")}</TabsTrigger>
        <TabsTrigger value="plans">{t("plans")}</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <OverviewTab
          dateRange={dateRange}
          exerciseType={exerciseType}
          mealType={mealType}
          onDateRangeChange={onDateRangeChange}
          onExerciseTypeChange={onExerciseTypeChange}
          onMealTypeChange={onMealTypeChange}
          onClearFilters={onClearFilters}
        />
      </TabsContent>

      <TabsContent value="workouts">
        <WorkoutsTab workouts={workouts} />
      </TabsContent>

      <TabsContent value="meals">
        <MealsTab meals={meals} />
      </TabsContent>

      <TabsContent value="measurements">
        <MeasurementsTab measurements={measurements} />
      </TabsContent>

      <TabsContent value="progress">
        <ProgressTab workoutStats={workoutStats} mealStats={mealStats} />
      </TabsContent>

      <TabsContent value="plans">
        <ClientPlansTab />
      </TabsContent>
    </Tabs>
  );
}
