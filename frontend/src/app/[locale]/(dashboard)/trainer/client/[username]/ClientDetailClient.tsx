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
import {
  DEFAULT_CLIENT_TAB,
  EMPTY_CLIENT_FILTERS,
  isClientTab,
  type ClientFilters,
  type ClientTab,
} from "@/components/features/trainer/client-tabs/client-filters";
import { ClientOverview } from "@/components/features/trainer/ClientOverview";
import { TerminateRelationshipDialog } from "@/components/features/trainer/TerminateRelationshipDialog";
import { ArrowLeft, UserX } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { useTranslations } from "next-intl";
import { STALE_TIMES } from "@/lib/api/api-constants";

export default function ClientDetailClient() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const username = params.username as string;
  const t = useTranslations("trainer.client_detail");

  const [activeTab, setActiveTab] = useState<ClientTab>(() => {
    const tabParam = searchParams.get("tab");
    // Old links could point at the removed "overview" tab; they fall back to
    // the first history view instead of rendering an empty panel.
    return isClientTab(tabParam) ? tabParam : DEFAULT_CLIENT_TAB;
  });

  // The filter bar applies one filter set to all history tabs; the tab that is
  // open decides which type filter is shown.
  const [filters, setFilters] = useState<ClientFilters>(EMPTY_CLIENT_FILTERS);

  const { data, isLoading, error } = useQuery({
    // Only the header + stats live in this query, so the shared filters must
    // not be part of the key — they would refetch both calls for nothing.
    queryKey: qk.clients.detail(username),
    queryFn: async () => {
      // Only the client header + stats live here. The workout / meal /
      // measurement histories are paginated per tab (WorkoutsTab, MealsTab,
      // MeasurementsTab) and filtered there, so pulling them here would fetch
      // page one twice and ship the whole history to a tab that may never open.
      const [details, statsResp] = await Promise.all([
        relationshipApi.getClientDetails(username),
        trainerClientApi.getClientStats(username),
      ]);
      return {
        athlete: details.athlete,
        stats: details.stats,
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
  const workoutStats = data?.workoutStats ?? null;
  const mealStats = data?.mealStats ?? null;
  const loading = isLoading;

  const handleTabChange = useCallback(
    (value: string) => {
      const next = isClientTab(value) ? value : DEFAULT_CLIENT_TAB;
      setActiveTab(next);
      // Update the URL without triggering a Next.js navigation/re-render,
      // which was causing the tab animation to lag.
      const params = new URLSearchParams(window.location.search);
      if (next === DEFAULT_CLIENT_TAB) {
        params.delete("tab");
      } else {
        params.set("tab", next);
      }
      const qs = params.toString();
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname],
  );

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
        username={username}
        workoutStats={workoutStats}
        mealStats={mealStats}
        filters={filters}
        onFiltersChange={setFilters}
      />
    </div>
  );
}
