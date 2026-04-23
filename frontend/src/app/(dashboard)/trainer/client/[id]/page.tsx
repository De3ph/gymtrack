"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
import { trainerClientApi, relationshipApi } from "@/lib/api"
import { User, ClientStats } from "@/types"
import { useAuthStore } from "@/stores/authStore"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ClientTabs } from "@/components/features/trainer/client-tabs/ClientTabs"
import { ClientOverview } from "@/components/features/trainer/ClientOverview"
import { Loader2, ArrowLeft, UserX } from "lucide-react"
import { ROUTES } from "@/lib/routes";

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
  const [showTerminateDialog, setShowTerminateDialog] = useState(false)

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
    try {
      await relationshipApi.terminateRelationship(clientId)
      setShowTerminateDialog(false)
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
        <Button variant="destructive" onClick={() => setShowTerminateDialog(true)}>
          <UserX className="mr-2 h-4 w-4" />
          End Relationship
        </Button>
      </div>

      <ClientOverview athlete={clientDetails.athlete} stats={clientDetails.stats} />

      <ClientTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        workouts={workouts}
        meals={meals}
        workoutStats={workoutStats}
        mealStats={mealStats}
        dateRange={dateRange}
        exerciseType={exerciseType}
        mealType={mealType}
        onDateRangeChange={setDateRange}
        onExerciseTypeChange={setExerciseType}
        onMealTypeChange={setMealType}
        onClearFilters={clearFilters}
      />

      <AlertDialog open={showTerminateDialog} onOpenChange={setShowTerminateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Relationship</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to end your relationship with {clientDetails.athlete?.profile?.name || "this athlete"}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleTerminateRelationship} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              End Relationship
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
