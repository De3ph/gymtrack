"use client"

import {
  LineChart,
  Line,
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
import { MealStats } from "@/lib/api/api-types"
import { useTranslations } from "next-intl"

interface NutritionTrendsChartProps {
  mealStats: MealStats
  chartConfig: ChartConfig
}

export function NutritionTrendsChart({ mealStats, chartConfig }: NutritionTrendsChartProps) {
  const t = useTranslations('trainer.charts.nutrition_trends')
  const tStats = useTranslations('trainer.charts.stats')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  )
}
