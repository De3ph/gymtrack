import { useCallback } from "react";
import { ScrollView, RefreshControl } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useReducedMotion,
} from "react-native-reanimated";
import { useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/stores/authStore";
import { workoutApi } from "@/api/workoutApi";
import { mealApi } from "@/api/mealApi";
import { relationshipApi } from "@/api/relationshipApi";
import { coachingRequestApi } from "@/api/coachingRequestApi";
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

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

const ENTER_DURATION = 260;
const ENTER_STAGGER = 60;
const ENTER_OFFSET = 12;

const enterFromBelow = (delay: number) =>
  FadeInDown.withInitialValues({ transform: [{ translateY: ENTER_OFFSET }] })
    .duration(ENTER_DURATION)
    .delay(delay)
    .easing(EASE_OUT);

const ENTER_HEADER = enterFromBelow(0);
const ENTER_QUICK_ACTIONS = enterFromBelow(ENTER_STAGGER);
const ENTER_RECENT_ACTIVITIES = enterFromBelow(ENTER_STAGGER * 2);

const REDUCED_MOTION_ENTER = FadeIn.duration(180);

export function DashboardScreen() {
  const colors = useAppColors();
  const { t } = useI18n();
  const { push } = useRouter();
  const reducedMotion = useReducedMotion();
  const user = useAuthStore((s) => s.user);
  const displayName =
    user?.profile?.name || user?.username || user?.email?.split("@")[0] || "";

  const isTrainer = user?.role === "trainer";

  const workoutsQuery = useQuery<WorkoutListResponse>({
    queryKey: ["workouts", "recent"],
    queryFn: () =>
      workoutApi.getAll({ limit: "5" }) as Promise<WorkoutListResponse>,
    enabled: !isTrainer,
  });

  const mealsQuery = useQuery<MealListResponse>({
    queryKey: ["meals", "recent"],
    queryFn: () => mealApi.getAll({ limit: "5" }) as Promise<MealListResponse>,
    enabled: !isTrainer,
  });

  const clientsQuery = useQuery({
    queryKey: ["relationships", "my-clients"],
    queryFn: () => relationshipApi.getMyClients(),
    enabled: isTrainer,
  });

  const pendingRequestsQuery = useQuery({
    queryKey: ["coaching-requests", "pending"],
    queryFn: () => coachingRequestApi.getPendingRequests(),
    enabled: isTrainer,
  });

  const isRefreshing = isTrainer
    ? clientsQuery.isRefetching || pendingRequestsQuery.isRefetching
    : workoutsQuery.isRefetching || mealsQuery.isRefetching;
  const isLoading = isTrainer
    ? clientsQuery.isLoading || pendingRequestsQuery.isLoading
    : workoutsQuery.isLoading || mealsQuery.isLoading;

  const onRefresh = useCallback(() => {
    if (isTrainer) {
      clientsQuery.refetch();
      pendingRequestsQuery.refetch();
      return;
    }
    workoutsQuery.refetch();
    mealsQuery.refetch();
  }, [isTrainer, workoutsQuery, mealsQuery, clientsQuery, pendingRequestsQuery]);

  const handleOpenActivity = useCallback(
    (type: RecentActivityType, id?: number) => {
      if (id != null) {
        push(
          ((type === "workout" ? "/workouts/" : "/meals/") + String(id)) as Href,
        );
        return;
      }
      push(type === "workout" ? "/(tabs)/workouts" : "/(tabs)/meals");
    },
    [push],
  );

  const workouts = workoutsQuery.data?.workouts ?? EMPTY_WORKOUTS;
  const meals = mealsQuery.data?.meals ?? EMPTY_MEALS;
  const hasActivity = workouts.length > 0 || meals.length > 0;

  const errorMessage = isTrainer
    ? (clientsQuery.error as Error)?.message ||
      (pendingRequestsQuery.error as Error)?.message ||
      ""
    : (workoutsQuery.error as Error)?.message ||
      (mealsQuery.error as Error)?.message ||
      "";

  const trainerClients = clientsQuery.data?.clients ?? [];
  const pendingRequests = pendingRequestsQuery.data?.requests ?? [];

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

  const hasError = isTrainer
    ? clientsQuery.isError || pendingRequestsQuery.isError
    : workoutsQuery.isError || mealsQuery.isError;
  if (hasError && (isTrainer ? trainerClients.length === 0 : !hasActivity)) {
    if (
      isSessionExpiredError(workoutsQuery.error) ||
      isSessionExpiredError(mealsQuery.error) ||
      isSessionExpiredError(clientsQuery.error) ||
      isSessionExpiredError(pendingRequestsQuery.error)
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
      <Animated.View className="gap-6">
        <Animated.View
          entering={reducedMotion ? REDUCED_MOTION_ENTER : ENTER_HEADER}
        >
          <Host matchContents={{ vertical: true, horizontal: false }}>
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
                {isTrainer
                  ? t("trainer.dashboard.description")
                  : t("dashboard.no_data.description")}
              </Text>
            </Column>
          </Host>
        </Animated.View>

        <Animated.View
          entering={
            reducedMotion ? REDUCED_MOTION_ENTER : ENTER_QUICK_ACTIONS
          }
        >
          <QuickActions />
        </Animated.View>

        <Animated.View
          entering={
            reducedMotion ? REDUCED_MOTION_ENTER : ENTER_RECENT_ACTIVITIES
          }
        >
          <Host matchContents={{ vertical: true, horizontal: false }}>
            {isTrainer ? (
              <Column spacing={8}>
                <Text
                  textStyle={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: colors.text,
                  }}
                >
                  {`${t("trainer.dashboard.clients")}: ${trainerClients.length}`}
                </Text>
                <Text textStyle={{ fontSize: 14, color: colors.textSecondary }}>
                  {`${t("trainer.dashboard.pending_requests")}: ${pendingRequests.length}`}
                </Text>
                {trainerClients.length === 0 && (
                  <Text
                    textStyle={{ fontSize: 14, color: colors.textSecondary }}
                  >
                    {t("trainer.dashboard.no_clients_description")}
                  </Text>
                )}
              </Column>
            ) : (
              <RecentActivitiesList
                workouts={workouts}
                meals={meals}
                onOpenActivity={handleOpenActivity}
              />
            )}
          </Host>
        </Animated.View>
      </Animated.View>
    </ScrollView>
  );
}
