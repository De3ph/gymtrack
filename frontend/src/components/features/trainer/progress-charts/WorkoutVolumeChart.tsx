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

interface WorkoutVolumeChartProps {
  workoutStats: WorkoutStats
  chartConfig: ChartConfig
}

export function WorkoutVolumeChart({ workoutStats, chartConfig }: WorkoutVolumeChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Workout Volume</CardTitle>
        <CardDescription>Total volume (sets × reps × weight) per week</CardDescription>
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
              <Bar dataKey="volume" fill="var(--color-volume)" name="Volume (kg)" />
              <Bar dataKey="workouts" fill="var(--color-workouts)" name="Workouts" />
            </BarChart>
          </ChartContainer>
        ) : (
          <p className="text-center text-muted-foreground py-8">No workout data available</p>
        )}
      </CardContent>
    </Card>
  )
}
