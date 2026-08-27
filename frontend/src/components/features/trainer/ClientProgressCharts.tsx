"use client"

import dynamic from "next/dynamic"
import { StatCard } from "./StatCard"
import { type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { WorkoutStats, MealStats } from "@/types"
import { useTranslations } from "next-intl"

const WorkoutVolumeChart = dynamic(
  () => import("./progress-charts/WorkoutVolumeChart").then(m => m.WorkoutVolumeChart),
  { ssr: false, loading: () => <Skeleton className="h-[300px]" /> }
)
const NutritionTrendsChart = dynamic(
  () => import("./progress-charts/NutritionTrendsChart").then(m => m.NutritionTrendsChart),
  { ssr: false, loading: () => <Skeleton className="h-[300px]" /> }
)
const MealTypeDistributionChart = dynamic(
  () => import("./progress-charts/MealTypeDistributionChart").then(m => m.MealTypeDistributionChart),
  { ssr: false, loading: () => <Skeleton className="h-[250px]" /> }
)
const ExerciseBreakdownChart = dynamic(
  () => import("./progress-charts/ExerciseBreakdownChart").then(m => m.ExerciseBreakdownChart),
  { ssr: false, loading: () => <Skeleton className="h-[250px]" /> }
)

interface ClientProgressChartsProps {
  workoutStats: WorkoutStats
  mealStats: MealStats
}

export function ClientProgressCharts({ workoutStats, mealStats }: ClientProgressChartsProps) {
  const tStats = useTranslations('trainer.charts.stats')

  const chartConfig = {
    volume: {
      label: tStats('volume_label'),
      color: "var(--chart-1)",
    },
    workouts: {
      label: tStats('workouts_label'),
      color: "var(--chart-2)",
    },
    calories: {
      label: tStats('calories_label'),
      color: "var(--chart-1)",
    },
    protein: {
      label: tStats('protein_label'),
      color: "var(--chart-2)",
    },
    carbs: {
      label: tStats('carbs_label'),
      color: "var(--chart-3)",
    },
    fats: {
      label: tStats('fats_label'),
      color: "var(--chart-4)",
    },
    totalSets: {
      label: tStats('total_sets_label'),
      color: "var(--chart-1)",
    },
    totalReps: {
      label: tStats('total_reps_label'),
      color: "var(--chart-2)",
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
