"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useParams,
  useRouter,
  useSearchParams,
  usePathname,
} from "next/navigation";
import { trainerClientApi, relationshipApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ClientTabs } from "@/components/features/trainer/client-tabs/ClientTabs";
import { ClientOverview } from "@/components/features/trainer/ClientOverview";
import { TerminateRelationshipDialog } from "@/components/features/trainer/TerminateRelationshipDialog";
import { ArrowLeft, UserX } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { useTranslations } from "next-intl";
import { STALE_TIMES } from "@/lib/api/api-constants";
import dayjs from "dayjs";

const VALID_TABS = [
  "overview",
  "workouts",
  "meals",
  "measurements",
  "progress",
  "plans",
];

export default function ClientDetailClient() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const username = params.username as string;
  const t = useTranslations("trainer.client_detail");

  const [activeTab, setActiveTab] = useState<string>(() => {
    const tabParam = searchParams.get("tab");
    return VALID_TABS.includes(tabParam ?? "") ? (tabParam as string) : "overview";
  });

  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });
  const [exerciseType, setExerciseType] = useState("");
  const [mealType, setMealType] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: qk.clients.detail(username, {
      dateRange,
      exerciseType,
      mealType,
    }),
    queryFn: async () => {
      const [details, workoutsResp, mealsResp, measurementsResp, statsResp] =
        await Promise.all([
          relationshipApi.getClientDetails(username),
          trainerClientApi.getClientWorkouts(username, {
            ...(dateRange.start && { startDate: dayjs(dateRange.start).startOf("day").toISOString() }),
            ...(dateRange.end && { endDate: dayjs(dateRange.end).endOf("day").toISOString() }),
            ...(exerciseType && { exerciseType }),
          }),
          trainerClientApi.getClientMeals(username, {
            ...(dateRange.start && { startDate: dayjs(dateRange.start).startOf("day").toISOString() }),
            ...(dateRange.end && { endDate: dayjs(dateRange.end).endOf("day").toISOString() }),
            ...(mealType && { mealType }),
          }),
          trainerClientApi.getClientMeasurements(username, {
            ...(dateRange.start && { startDate: dayjs(dateRange.start).startOf("day").toISOString() }),
            ...(dateRange.end && { endDate: dayjs(dateRange.end).endOf("day").toISOString() }),
          }),
          trainerClientApi.getClientStats(username),
        ]);
      return {
        athlete: details.athlete,
        stats: details.stats,
        workouts: workoutsResp.workouts,
        meals: mealsResp.meals,
        measurements: measurementsResp.measurements,
        workoutStats: statsResp.workoutStats
          ? {
              totalVolume: statsResp.workoutStats.totalVolume ?? 0,
              weeklyVolume: (statsResp.workoutStats.weeklyVolume ?? []).map((w) => ({
                week: w.week ?? "",
                volume: w.volume ?? 0,
                workouts: w.workouts ?? 0,
              })),
              maxWeight: 0, // Not in generated WorkoutStats
              consistency: statsResp.workoutStats.consistency ?? 0,
              exerciseBreakdown: (statsResp.workoutStats.exerciseBreakdown ?? []).map((e) => ({
                name: e.name ?? "",
                totalSets: 0,
                totalReps: 0,
                maxWeight: e.maxWeight ?? 0,
              })),
            }
          : null,
        mealStats: statsResp.mealStats
          ? {
              averageCalories: statsResp.mealStats.averageCalories ?? 0,
              averageProtein: statsResp.mealStats.averageProtein ?? 0,
              averageCarbs: statsResp.mealStats.averageCarbs ?? 0,
              averageFats: statsResp.mealStats.averageFats ?? 0,
              weeklyAverages: (statsResp.mealStats.weeklyAverages ?? []).map((w) => ({
                week: w.week ?? "",
                calories: w.calories ?? 0,
                protein: w.protein ?? 0,
                carbs: w.carbs ?? 0,
                fats: w.fats ?? 0,
              })),
              mealTypeBreakdown: (statsResp.mealStats.mealTypeBreakdown ?? []).map((m) => ({
                mealType: m.mealType ?? "",
                count: m.count ?? 0,
              })),
            }
          : null,
      };
    },
    staleTime: STALE_TIMES.FIVE_MINUTES,
    enabled: user?.role === "trainer",
  });

  const clientDetails = {
    athlete: data?.athlete ?? null,
    stats: data?.stats ?? null,
  };
  const workouts = data?.workouts ?? [];
  const meals = data?.meals ?? [];
  const measurements = data?.measurements ?? [];
  const workoutStats = data?.workoutStats ?? null;
  const mealStats = data?.mealStats ?? null;
  const loading = isLoading;

  const handleTabChange = useCallback(
    (value: string) => {
      const next = VALID_TABS.includes(value) ? value : "overview";
      setActiveTab(next);
      // Update the URL without triggering a Next.js navigation/re-render,
      // which was causing the tab animation to lag.
      const params = new URLSearchParams(window.location.search);
      if (next === "overview") {
        params.delete("tab");
      } else {
        params.set("tab", next);
      }
      const qs = params.toString();
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname],
  );

  const clearFilters = () => {
    setDateRange({ start: "", end: "" });
    setExerciseType("");
    setMealType("");
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
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <Spinner className="size-5" />
          <span>Loading</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div
          role="alert"
          className="border border-destructive px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-destructive"
        >
          {error instanceof Error ? error.message : String(error)}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push(ROUTES.TRAINER_CLIENTS)}
            className="rounded-none font-mono text-[10px] uppercase tracking-[0.18em]"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
            {t("back")}
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {clientDetails.athlete?.profile?.name || t("client_details")}
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {clientDetails.athlete?.email}
            </p>
          </div>
        </div>
        <TerminateRelationshipDialog
          clientId={clientDetails.athlete?.userId ?? 0}
          athleteName={clientDetails.athlete?.profile?.name}
          trigger={
            <Button
              variant="destructive"
              className="rounded-none font-mono text-[10px] uppercase tracking-[0.18em]"
            >
              <UserX className="size-5" aria-hidden="true" />
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
        onTabChange={handleTabChange}
        workouts={workouts}
        meals={meals}
        measurements={measurements}
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
