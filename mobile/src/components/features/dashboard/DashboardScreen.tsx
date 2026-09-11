import { useCallback } from "react";
import { ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/stores/authStore";
import { workoutApi } from "@/api/workoutApi";
import { mealApi } from "@/api/mealApi";
import type {
  Workout,
  Meal,
  WorkoutListResponse,
  MealListResponse,
} from "@/types";
import { Button, Column, Host, RNHostView, Text } from "@expo/ui";
import { Spinner } from "@/components/ui/spinner";
import { Center } from "@/components/ui/center";
import { isSessionExpiredError } from "@/api/client";
import { SessionExpiredView } from "@/components/features/auth/SessionExpiredView";
import { QuickActions } from "./QuickActions";
import type { RecentActivityType } from "./RecentActivityCard";
import { RecentActivitiesList } from "./RecentActivitiesList";
import { useAppColors } from "@/lib/colors";

const EMPTY_WORKOUTS: Workout[] = [];
const EMPTY_MEALS: Meal[] = [];

export function DashboardScreen() {
  const colors = useAppColors();
  const { t } = useI18n();
  const { push } = useRouter();
  const user = useAuthStore((s) => s.user);
  const displayName =
    user?.profile?.name || user?.username || user?.email?.split("@")[0] || "";

  const workoutsQuery = useQuery<WorkoutListResponse>({
    queryKey: ["workouts", "recent"],
    queryFn: () =>
      workoutApi.getAll({ limit: "5" }) as Promise<WorkoutListResponse>,
  });

  const mealsQuery = useQuery<MealListResponse>({
    queryKey: ["meals", "recent"],
    queryFn: () => mealApi.getAll({ limit: "5" }) as Promise<MealListResponse>,
  });

  const isRefreshing = workoutsQuery.isRefetching || mealsQuery.isRefetching;
  const isLoading = workoutsQuery.isLoading || mealsQuery.isLoading;

  const onRefresh = useCallback(() => {
    workoutsQuery.refetch();
    mealsQuery.refetch();
  }, [workoutsQuery, mealsQuery]);

  const handleOpenActivity = useCallback(
    (type: RecentActivityType) => {
      push(type === "workout" ? "/(tabs)/workouts" : "/(tabs)/meals");
    },
    [push],
  );

  const workouts = workoutsQuery.data?.workouts ?? EMPTY_WORKOUTS;
  const meals = mealsQuery.data?.meals ?? EMPTY_MEALS;
  const hasActivity = workouts.length > 0 || meals.length > 0;

  const errorMessage =
    (workoutsQuery.error as Error)?.message ||
    (mealsQuery.error as Error)?.message ||
    "";

  if (isLoading) {
    return (
      <Center className="flex-1 bg-background p-4">
        <Host matchContents>
          <Column spacing={12} alignment="center">
            <RNHostView matchContents>
              <Spinner size="large" />
            </RNHostView>
            <Text textStyle={{ fontSize: 14, color: colors.textSecondary }}>
              {t("common.loading")}
            </Text>
          </Column>
        </Host>
      </Center>
    );
  }

  const hasError = workoutsQuery.isError || mealsQuery.isError;
  if (hasError && !hasActivity) {
    if (
      isSessionExpiredError(workoutsQuery.error) ||
      isSessionExpiredError(mealsQuery.error)
    ) {
      return <SessionExpiredView message={errorMessage} />;
    }
    return (
      <Center className="flex-1 bg-background p-4">
        <Host matchContents>
          <Column spacing={16} alignment="center">
            <Text
              textStyle={{
                fontSize: 16,
                textAlign: "center",
                color: colors.dangerText,
              }}
            >
              {errorMessage || t("common.errors.generic")}
            </Text>
            <Button label={t("common.actions.retry")} onPress={onRefresh} />
          </Column>
        </Host>
      </Center>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 pb-10"
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      <Host matchContents={{ vertical: true, horizontal: false }}>
        <Column spacing={24}>
          <Column spacing={4}>
            <Text
              textStyle={{
                fontSize: 24,
                lineHeight: 30,
                fontWeight: "bold",
                color: colors.text,
              }}
            >
              {t("dashboard.welcome").replace("{name}", displayName)}
            </Text>
            <Text textStyle={{ fontSize: 14, color: colors.textSecondary }}>
              {t("dashboard.no_data.description")}
            </Text>
          </Column>

          <RNHostView matchContents>
            <QuickActions />
          </RNHostView>

          <RecentActivitiesList
            workouts={workouts}
            meals={meals}
            onOpenActivity={handleOpenActivity}
          />
        </Column>
      </Host>
    </ScrollView>
  );
}
