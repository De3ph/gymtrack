"use client"

import {
  LineChart,
  Line,
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
import { MealStats } from "@/types"
import { useTranslations } from "next-intl"

interface NutritionTrendsChartProps {
  mealStats: MealStats
  chartConfig: ChartConfig
}

export function NutritionTrendsChart({ mealStats, chartConfig }: NutritionTrendsChartProps) {
  const t = useTranslations('trainer.charts.nutrition_trends')
  const tStats = useTranslations('trainer.charts.stats')

  return (
    <div className="rounded-none border border-border">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('title')}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
      </div>
      <div className="p-6">
        {mealStats.weeklyAverages.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[300px]">
            <LineChart data={mealStats.weeklyAverages}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line type="monotone" dataKey="calories" stroke="var(--color-calories)" name={tStats('calories_label')} />
              <Line type="monotone" dataKey="protein" stroke="var(--color-protein)" name={tStats('protein_label')} />
              <Line type="monotone" dataKey="carbs" stroke="var(--color-carbs)" name={tStats('carbs_label')} />
              <Line type="monotone" dataKey="fats" stroke="var(--color-fats)" name={tStats('fats_label')} />
            </LineChart>
          </ChartContainer>
        ) : (
          <p className="text-center text-muted-foreground py-8">{t('no_data')}</p>
        )}
      </div>
    </div>
  )
}
