"use client"

import { StatCard } from "./StatCard"
import { type ChartConfig } from "@/components/ui/chart"
import { WorkoutStats, MealStats } from "@/lib/api/api-types"
import { WorkoutVolumeChart } from "./progress-charts/WorkoutVolumeChart"
import { NutritionTrendsChart } from "./progress-charts/NutritionTrendsChart"
import { MealTypeDistributionChart } from "./progress-charts/MealTypeDistributionChart"
import { ExerciseBreakdownChart } from "./progress-charts/ExerciseBreakdownChart"

const chartConfig = {
  volume: {
    label: "Volume (kg)",
    color: "#8884d8",
  },
  workouts: {
    label: "Workouts",
    color: "#82ca9d",
  },
  calories: {
    label: "Calories",
    color: "#8884d8",
  },
  protein: {
    label: "Protein (g)",
    color: "#82ca9d",
  },
  carbs: {
    label: "Carbs (g)",
    color: "#ffc658",
  },
  fats: {
    label: "Fats (g)",
    color: "#ff8042",
  },
  totalSets: {
    label: "Total Sets",
    color: "#8884d8",
  },
  totalReps: {
    label: "Total Reps",
    color: "#82ca9d",
  },
} satisfies ChartConfig

interface ClientProgressChartsProps {
  workoutStats: WorkoutStats
  mealStats: MealStats
}

export function ClientProgressCharts({ workoutStats, mealStats }: ClientProgressChartsProps) {
  return (
    <div className="space-y-6">
      {/* Workout Volume Chart */}
      <WorkoutVolumeChart workoutStats={workoutStats} chartConfig={chartConfig} />

      {/* Nutrition Trends Chart */}
      <NutritionTrendsChart mealStats={mealStats} chartConfig={chartConfig} />

      {/* Meal Type and Exercise Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        <MealTypeDistributionChart mealStats={mealStats} chartConfig={chartConfig} />
        <ExerciseBreakdownChart workoutStats={workoutStats} chartConfig={chartConfig} />
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Average Calories/Day"
          value={Math.round(mealStats.averageCalories)}
        />
        <StatCard
          title="Avg Protein/Day"
          value={`${Math.round(mealStats.averageProtein)}g`}
        />
        <StatCard
          title="Total Volume"
          value={`${Math.round(workoutStats.totalVolume).toLocaleString()} kg`}
        />
        <StatCard
          title="Workout Consistency"
          value={`${Math.round(workoutStats.consistency)}%`}
        />
      </div>
    </div>
  )
}
