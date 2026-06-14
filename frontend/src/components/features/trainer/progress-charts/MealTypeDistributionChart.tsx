"use client"

import {
  PieChart,
  Pie,
  Cell,
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

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"]

interface MealTypeDistributionChartProps {
  mealStats: MealStats
  chartConfig: ChartConfig
}

export function MealTypeDistributionChart({ mealStats, chartConfig }: MealTypeDistributionChartProps) {
  const t = useTranslations('trainer.charts.meal_type_distribution')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {mealStats.mealTypeBreakdown.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[250px]">
            <PieChart>
              <Pie
                data={mealStats.mealTypeBreakdown}
                dataKey="count"
                nameKey="mealType"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {mealStats.mealTypeBreakdown.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
            </PieChart>
          </ChartContainer>
        ) : (
          <p className="text-center text-muted-foreground py-8">{t('no_data')}</p>
        )}
      </CardContent>
    </Card>
  )
}
