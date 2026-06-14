"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { trainerClientApi, relationshipApi } from "@/lib/api";
import { User, ClientStats } from "@/types";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { ClientTabs } from "@/components/features/trainer/client-tabs/ClientTabs";
import { ClientOverview } from "@/components/features/trainer/ClientOverview";
import { TerminateRelationshipDialog } from "@/components/features/trainer/TerminateRelationshipDialog";
import { Loader2, ArrowLeft, UserX } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { useTranslations } from "next-intl";

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const username = params.username as string;
  const t = useTranslations("trainer.client_detail");

  const [activeTab, setActiveTab] = useState("overview");

  // Filter states
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });
  const [exerciseType, setExerciseType] = useState("");
  const [mealType, setMealType] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["clientData", username, dateRange, exerciseType, mealType],
    queryFn: async () => {
      const details = await relationshipApi.getClientDetails(username);
      const [workoutsResp, mealsResp, statsResp] = await Promise.all([
        trainerClientApi.getClientWorkouts(username, {
          ...(dateRange.start && { startDate: dateRange.start }),
          ...(dateRange.end && { endDate: dateRange.end }),
          ...(exerciseType && { exerciseType }),
        }),
        trainerClientApi.getClientMeals(username, {
          ...(dateRange.start && { startDate: dateRange.start }),
          ...(dateRange.end && { endDate: dateRange.end }),
          ...(mealType && { mealType }),
        }),
        trainerClientApi.getClientStats(username),
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

  const clientDetails = {
    athlete: data?.athlete ?? null,
    stats: data?.stats ?? null,
  };
  const workouts = data?.workouts ?? [];
  const meals = data?.meals ?? [];
  const workoutStats = data?.workoutStats ?? null;
  const mealStats = data?.mealStats ?? null;
  const loading = isLoading;

  const clearFilters = () => {
    setDateRange({ start: "", end: "" });
    setExerciseType("");
    setMealType("");
    // Query will refetch automatically due to queryKey change
  };

  const applyFilters = () => {
    // No-op: query automatically refetches when filter state changes
  };

  useEffect(() => {
    if (user?.role !== "trainer") {
      router.push(ROUTES.HOME);
      return;
    }
  }, [user, router]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(ROUTES.TRAINER_CLIENTS)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("back")}
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {clientDetails.athlete?.profile?.name || t("client_details")}
            </h1>
            <p className="text-muted-foreground">
              {clientDetails.athlete?.email}
            </p>
          </div>
        </div>
        <TerminateRelationshipDialog
          clientId={clientDetails.athlete?.userId || ""}
          athleteName={clientDetails.athlete?.profile?.name}
          trigger={
            <Button variant="destructive">
              <UserX className="mr-2 h-4 w-4" />
              {t("end_relationship")}
            </Button>
          }
        />
      </div>

      <ClientOverview
        athlete={clientDetails.athlete}
        stats={clientDetails.stats}
      />

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
    </div>
  );
}
