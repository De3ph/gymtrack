"use client"

import { StatCard } from "./StatCard"
import { type ChartConfig } from "@/components/ui/chart"
import { WorkoutStats, MealStats } from "@/lib/api/api-types"
import { WorkoutVolumeChart } from "./progress-charts/WorkoutVolumeChart"
import { NutritionTrendsChart } from "./progress-charts/NutritionTrendsChart"
import { MealTypeDistributionChart } from "./progress-charts/MealTypeDistributionChart"
import { ExerciseBreakdownChart } from "./progress-charts/ExerciseBreakdownChart"
import { useTranslations } from "next-intl"

interface ClientProgressChartsProps {
  workoutStats: WorkoutStats
  mealStats: MealStats
}

export function ClientProgressCharts({ workoutStats, mealStats }: ClientProgressChartsProps) {
  const tStats = useTranslations('trainer.charts.stats')

  const chartConfig = {
    volume: {
      label: tStats('volume_label'),
      color: "#8884d8",
    },
    workouts: {
      label: tStats('workouts_label'),
      color: "#82ca9d",
    },
    calories: {
      label: tStats('calories_label'),
      color: "#8884d8",
    },
    protein: {
      label: tStats('protein_label'),
      color: "#82ca9d",
    },
    carbs: {
      label: tStats('carbs_label'),
      color: "#ffc658",
    },
    fats: {
      label: tStats('fats_label'),
      color: "#ff8042",
    },
    totalSets: {
      label: tStats('total_sets_label'),
      color: "#8884d8",
    },
    totalReps: {
      label: tStats('total_reps_label'),
      color: "#82ca9d",
    },
  } satisfies ChartConfig

  return (
    <div className="space-y-6">
      <WorkoutVolumeChart workoutStats={workoutStats} chartConfig={chartConfig} />
      <NutritionTrendsChart mealStats={mealStats} chartConfig={chartConfig} />
      <div className="grid gap-6 md:grid-cols-2">
        <MealTypeDistributionChart mealStats={mealStats} chartConfig={chartConfig} />
        <ExerciseBreakdownChart workoutStats={workoutStats} chartConfig={chartConfig} />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title={tStats('avg_calories_per_day')}
          value={Math.round(mealStats.averageCalories)}
        />
        <StatCard
          title={tStats('avg_protein_per_day')}
          value={`${Math.round(mealStats.averageProtein)}g`}
        />
        <StatCard
          title={tStats('total_volume')}
          value={`${Math.round(workoutStats.totalVolume).toLocaleString()} kg`}
        />
        <StatCard
          title={tStats('workout_consistency')}
          value={`${Math.round(workoutStats.consistency)}%`}
        />
      </div>
    </div>
  )
}
