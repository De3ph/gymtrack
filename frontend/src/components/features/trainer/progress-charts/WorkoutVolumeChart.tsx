"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { WorkoutStats } from "@/types"
import { useTranslations } from "next-intl"

interface WorkoutVolumeChartProps {
  workoutStats: WorkoutStats
  chartConfig: ChartConfig
}

export function WorkoutVolumeChart({ workoutStats, chartConfig }: WorkoutVolumeChartProps) {
  const t = useTranslations('trainer.charts.workout_volume')

  return (
    <div className="rounded-none border border-border">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('title')}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
      </div>
      <div className="p-6">
        {workoutStats.weeklyVolume.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[300px]">
            <BarChart data={workoutStats.weeklyVolume}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="volume" fill="var(--color-volume)" name={t('volume')} />
              <Bar dataKey="workouts" fill="var(--color-workouts)" name={t('workouts')} />
            </BarChart>
          </ChartContainer>
        ) : (
          <p className="text-center text-muted-foreground py-8">{t('no_data')}</p>
        )}
      </div>
    </div>
  )
}
