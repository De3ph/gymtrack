"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { WorkoutStats } from "@/lib/api/api-types"
import { useTranslations } from "next-intl"

interface WorkoutVolumeChartProps {
  workoutStats: WorkoutStats
  chartConfig: ChartConfig
}

export function WorkoutVolumeChart({ workoutStats, chartConfig }: WorkoutVolumeChartProps) {
  const t = useTranslations('trainer.charts.workout_volume')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  )
}
