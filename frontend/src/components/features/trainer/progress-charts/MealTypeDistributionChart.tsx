"use client"

import {
  PieChart,
  Pie,
  Cell,
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

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-1)"]

interface MealTypeDistributionChartProps {
  mealStats: MealStats
  chartConfig: ChartConfig
}

export function MealTypeDistributionChart({ mealStats, chartConfig }: MealTypeDistributionChartProps) {
  const t = useTranslations('trainer.charts.meal_type_distribution')

  return (
    <div className="rounded-none border border-border">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('title')}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
      </div>
      <div className="p-6">
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
      </div>
    </div>
  )
}
