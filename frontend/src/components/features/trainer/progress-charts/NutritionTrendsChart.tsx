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

interface NutritionTrendsChartProps {
  mealStats: MealStats
  chartConfig: ChartConfig
}

export function NutritionTrendsChart({ mealStats, chartConfig }: NutritionTrendsChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Nutrition Trends</CardTitle>
        <CardDescription>Average daily macros per week</CardDescription>
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
              <Line type="monotone" dataKey="calories" stroke="var(--color-calories)" name="Calories" />
              <Line type="monotone" dataKey="protein" stroke="var(--color-protein)" name="Protein (g)" />
              <Line type="monotone" dataKey="carbs" stroke="var(--color-carbs)" name="Carbs (g)" />
              <Line type="monotone" dataKey="fats" stroke="var(--color-fats)" name="Fats (g)" />
            </LineChart>
          </ChartContainer>
        ) : (
          <p className="text-center text-muted-foreground py-8">No meal data available</p>
        )}
      </CardContent>
    </Card>
  )
}
