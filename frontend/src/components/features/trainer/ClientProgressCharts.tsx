"use client"

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
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
import { WorkoutStats, MealStats } from "@/lib/api/api-types"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"]

const chartConfig = {
  volume: {
    label: "Volume (kg)",
    color: "#8884d8",
  },
  workouts: {
    label: "Workouts",
    color: "#82ca9d",
  },
  calories: {
    label: "Calories",
    color: "#8884d8",
  },
  protein: {
    label: "Protein (g)",
    color: "#82ca9d",
  },
  carbs: {
    label: "Carbs (g)",
    color: "#ffc658",
  },
  fats: {
    label: "Fats (g)",
    color: "#ff8042",
  },
  totalSets: {
    label: "Total Sets",
    color: "#8884d8",
  },
  totalReps: {
    label: "Total Reps",
    color: "#82ca9d",
  },
} satisfies ChartConfig

interface ClientProgressChartsProps {
  workoutStats: WorkoutStats
  mealStats: MealStats
}

export function ClientProgressCharts({ workoutStats, mealStats }: ClientProgressChartsProps) {
  return (
    <div className="space-y-6">
      {/* Workout Volume Chart */}
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

      {/* Nutrition Trends Chart */}
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

      {/* Meal Type Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
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

        {/* Exercise Breakdown */}
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
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Calories/Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(mealStats.averageCalories)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Protein/Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(mealStats.averageProtein)}g</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(workoutStats.totalVolume).toLocaleString()} kg</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Workout Consistency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(workoutStats.consistency)}%</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
