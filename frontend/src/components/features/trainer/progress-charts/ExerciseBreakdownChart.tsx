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

interface ExerciseBreakdownChartProps {
  workoutStats: WorkoutStats
  chartConfig: ChartConfig
}

export function ExerciseBreakdownChart({ workoutStats, chartConfig }: ExerciseBreakdownChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Exercises</CardTitle>
        <CardDescription>Most performed exercises</CardDescription>
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
              <Bar dataKey="totalSets" fill="var(--color-totalSets)" name="Total Sets" />
              <Bar dataKey="totalReps" fill="var(--color-totalReps)" name="Total Reps" />
            </BarChart>
          </ChartContainer>
        ) : (
          <p className="text-center text-muted-foreground py-8">No workout data available</p>
        )}
      </CardContent>
    </Card>
  )
}
