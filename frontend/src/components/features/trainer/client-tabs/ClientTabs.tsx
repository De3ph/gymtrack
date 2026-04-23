"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "./OverviewTab";
import { WorkoutsTab } from "./WorkoutsTab";
import { MealsTab } from "./MealsTab";
import { ProgressTab } from "./ProgressTab";

interface ClientTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  workouts: any[];
  meals: any[];
  workoutStats: any;
  mealStats: any;
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
  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList className="mb-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="workouts">Workouts ({workouts.length})</TabsTrigger>
        <TabsTrigger value="meals">Meals ({meals.length})</TabsTrigger>
        <TabsTrigger value="progress">Progress Charts</TabsTrigger>
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

      <TabsContent value="progress">
        <ProgressTab workoutStats={workoutStats} mealStats={mealStats} />
      </TabsContent>
    </Tabs>
  );
}
