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

interface ExerciseBreakdownChartProps {
  workoutStats: WorkoutStats
  chartConfig: ChartConfig
}

export function ExerciseBreakdownChart({ workoutStats, chartConfig }: ExerciseBreakdownChartProps) {
  const t = useTranslations('trainer.charts.exercise_breakdown')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {workoutStats.exerciseBreakdown.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[250px]">
            <BarChart
              data={workoutStats.exerciseBreakdown.slice(0, 5)}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="totalSets" fill="var(--color-totalSets)" name={t('total_sets')} />
              <Bar dataKey="totalReps" fill="var(--color-totalReps)" name={t('total_reps')} />
            </BarChart>
          </ChartContainer>
        ) : (
          <p className="text-center text-muted-foreground py-8">{t('no_data')}</p>
        )}
      </CardContent>
    </Card>
  )
}
