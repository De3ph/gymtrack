"use client"

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WorkoutStats, MealStats } from "@/lib/api-types"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"]

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
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={workoutStats.weeklyVolume}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="volume" fill="#8884d8" name="Volume (kg)" />
                <Bar dataKey="workouts" fill="#82ca9d" name="Workouts" />
              </BarChart>
            </ResponsiveContainer>
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
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mealStats.weeklyAverages}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="calories" stroke="#8884d8" name="Calories" />
                <Line type="monotone" dataKey="protein" stroke="#82ca9d" name="Protein (g)" />
                <Line type="monotone" dataKey="carbs" stroke="#ffc658" name="Carbs (g)" />
                <Line type="monotone" dataKey="fats" stroke="#ff8042" name="Fats (g)" />
              </LineChart>
            </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height={250}>
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
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={workoutStats.exerciseBreakdown.slice(0, 5)}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="totalSets" fill="#8884d8" name="Total Sets" />
                  <Bar dataKey="totalReps" fill="#82ca9d" name="Total Reps" />
                </BarChart>
              </ResponsiveContainer>
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
