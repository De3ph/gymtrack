"use client"

import { useState, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useQuery } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
import { trainerClientApi, relationshipApi } from "@/lib/api"
import { Workout, Meal, User, ClientStats } from "@/types"
import { WorkoutStats, MealStats } from "@/lib/api/api-types"
import { useAuthStore } from "@/stores/authStore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WorkoutList } from "@/components/features/workout/WorkoutList"
import { MealList } from "@/components/features/meal/MealList"
import { ClientProgressCharts } from "@/components/features/trainer/ClientProgressCharts"
import { Loader2, ArrowLeft, UserX, Dumbbell, Utensils, Calendar } from "lucide-react"
import { ROUTES, buildRoute } from "@/lib/routes";
// useCallback removed; data fetching now via TanStack Query

interface ClientDetails {
  athlete: User | null
  stats: ClientStats | null
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const clientId = params.id as string

  const [activeTab, setActiveTab] = useState("overview")
  const [terminateError, setTerminateError] = useState<string | null>(null)

  // Filter states
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" })
  const [exerciseType, setExerciseType] = useState("")
  const [mealType, setMealType] = useState("")

  const { data, isLoading, error } = useQuery({
    queryKey: ["clientData", clientId, dateRange, exerciseType, mealType],
    queryFn: async () => {
      const details = await relationshipApi.getClientDetails(clientId);
      const [workoutsResp, mealsResp, statsResp] = await Promise.all([
        trainerClientApi.getClientWorkouts(clientId, {
          ...(dateRange.start && { startDate: dateRange.start }),
          ...(dateRange.end && { endDate: dateRange.end }),
          ...(exerciseType && { exerciseType }),
        }),
        trainerClientApi.getClientMeals(clientId, {
          ...(dateRange.start && { startDate: dateRange.start }),
          ...(dateRange.end && { endDate: dateRange.end }),
          ...(mealType && { mealType }),
        }),
        trainerClientApi.getClientStats(clientId),
      ]);
      return {
        athlete: details.athlete,
        stats: details.stats,
        workouts: workoutsResp.workouts,
        meals: mealsResp.meals,
        workoutStats: statsResp.workoutStats,
        mealStats: statsResp.mealStats,
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: user?.role === "trainer",
  });

  const clientDetails = { athlete: data?.athlete ?? null, stats: data?.stats ?? null };
  const workouts = data?.workouts ?? [];
  const meals = data?.meals ?? [];
  const workoutStats = data?.workoutStats ?? null;
  const mealStats = data?.mealStats ?? null;
  const loading = isLoading;





  const clearFilters = () => {
    setDateRange({ start: "", end: "" })
    setExerciseType("")
    setMealType("")
    // Query will refetch automatically due to queryKey change
  }

  const applyFilters = () => {
    // No-op: query automatically refetches when filter state changes
  }

  useEffect(() => {
    if (user?.role !== "trainer") {
      router.push(ROUTES.HOME)
      return
    }
  }, [user, router])

  const handleTerminateRelationship = async () => {
    if (!confirm("Are you sure you want to end this relationship?")) {
      return
    }

    try {
      await relationshipApi.terminateRelationship(clientId)
      router.push(ROUTES.TRAINER_CLIENTS)
    } catch (err) {
      setTerminateError(err instanceof Error ? err.message : "Failed to terminate relationship")
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (terminateError && !clientDetails.athlete) {
    return (
      <div className="container mx-auto py-6">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          {terminateError}
        </div>
        <Button variant="outline" className="mt-4" onClick={() => router.push(ROUTES.TRAINER_CLIENTS)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Clients
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push(ROUTES.TRAINER_CLIENTS)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {clientDetails.athlete?.profile?.name || "Client Details"}
            </h1>
            <p className="text-muted-foreground">
              {clientDetails.athlete?.email}
            </p>
          </div>
        </div>
        <Button variant="destructive" onClick={handleTerminateRelationship}>
          <UserX className="mr-2 h-4 w-4" />
          End Relationship
        </Button>
      </div>

      {/* Stats Cards */}
      {clientDetails.stats && (
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Workouts</CardTitle>
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientDetails.stats.totalWorkouts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Meals</CardTitle>
              <Utensils className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientDetails.stats.totalMeals}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Workouts This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientDetails.stats.workoutsThisWeek}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meals This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientDetails.stats.mealsThisWeek}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Client Info */}
      {clientDetails.athlete?.profile ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Athlete Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {clientDetails.athlete.profile.age ? (
                <div>
                  <span className="text-sm font-medium">Age:</span> {clientDetails.athlete.profile.age}
                </div>
              ) : null}
              {clientDetails.athlete.profile.weight ? (
                <div>
                  <span className="text-sm font-medium">Weight:</span> {clientDetails.athlete.profile.weight} kg
                </div>
              ) : null}
              {clientDetails.athlete.profile.height ? (
                <div>
                  <span className="text-sm font-medium">Height:</span> {clientDetails.athlete.profile.height} cm
                </div>
              ) : null}
              {clientDetails.athlete.profile.fitnessGoals ? (
                <div className="md:col-span-2">
                  <span className="text-sm font-medium">Fitness Goals:</span> {clientDetails.athlete.profile.fitnessGoals}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="workouts">Workouts ({workouts.length})</TabsTrigger>
          <TabsTrigger value="meals">Meals ({meals.length})</TabsTrigger>
          <TabsTrigger value="progress">Progress Charts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {/* Filters for Overview */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filter Data</CardTitle>
              <CardDescription>Filter workouts and meals by date range and type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="mt-1 block rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End Date</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="mt-1 block rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Exercise Type</label>
                  <input
                    type="text"
                    placeholder="e.g., Bench Press"
                    value={exerciseType}
                    onChange={(e) => setExerciseType(e.target.value)}
                    className="mt-1 block rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Meal Type</label>
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value)}
                    className="mt-1 block rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">All</option>
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={applyFilters}>
                    Apply Filters
                  </Button>
                  <Button variant="outline" onClick={clearFilters}>
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workouts">
          <Card>
            <CardHeader>
              <CardTitle>Workout History</CardTitle>
              <CardDescription>
                View all workouts logged by this athlete
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workouts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No workouts found
                </p>
              ) : (
                <WorkoutList
                  workouts={workouts}
                  readOnly={true}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meals">
          <Card>
            <CardHeader>
              <CardTitle>Meal History</CardTitle>
              <CardDescription>
                View all meals logged by this athlete
              </CardDescription>
            </CardHeader>
            <CardContent>
              {meals.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No meals found
                </p>
              ) : (
                <MealList
                  meals={meals}
                  readOnly={true}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress">
          {workoutStats && mealStats ? (
            <ClientProgressCharts
              workoutStats={workoutStats}
              mealStats={mealStats}
            />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
