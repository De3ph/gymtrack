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

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"]

interface MealTypeDistributionChartProps {
  mealStats: MealStats
  chartConfig: ChartConfig
}

export function MealTypeDistributionChart({ mealStats, chartConfig }: MealTypeDistributionChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Meal Type Distribution</CardTitle>
        <CardDescription>Breakdown of meals by type</CardDescription>
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
          <p className="text-center text-muted-foreground py-8">No meal data available</p>
        )}
      </CardContent>
    </Card>
  )
}
