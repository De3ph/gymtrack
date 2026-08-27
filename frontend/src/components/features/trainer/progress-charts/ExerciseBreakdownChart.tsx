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

interface ExerciseBreakdownChartProps {
  workoutStats: WorkoutStats
  chartConfig: ChartConfig
}

export function ExerciseBreakdownChart({ workoutStats, chartConfig }: ExerciseBreakdownChartProps) {
  const t = useTranslations('trainer.charts.exercise_breakdown')

  return (
    <div className="rounded-none border border-border">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('title')}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
      </div>
      <div className="p-6">
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
      </div>
    </div>
  )
}
