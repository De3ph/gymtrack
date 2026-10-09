import React, { useCallback, useMemo } from "react";
import { RefreshControl, Alert, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useRouter, type Href } from "expo-router";
import { useI18n } from "@/lib/i18n";
import { workoutApi } from "@/api/workoutApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Workout, WorkoutListResponse, WorkoutPlan } from "@/types";
import { canEdit } from "@/lib/canEdit";
import { triggerHaptic } from "@/lib/haptics";
import { workoutPlanApi } from "@/api/workoutPlanApi";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Button, Host } from "@expo/ui";
import { Spinner } from "@/components/ui/spinner";
import { FabMenu, type FabMenuAction } from "@/components/ui/fab/fab-menu";
import { Icon, AddIcon } from "@/components/ui/icon";
import { WorkoutCard } from "./WorkoutCard";
import { isSessionExpiredError } from "@/api/client";
import { SessionExpiredView } from "@/components/features/auth/SessionExpiredView";
import { useWorkoutFormStore } from "@/stores/workout-form-store";
import { useAuthStore } from "@/stores/authStore";

import {
  SwipeCoordinatorProvider,
  useCreateSwipeCoordinator,
} from "@/components/features/common/history-card";

export function WorkoutsScreen() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const router = useRouter();
  const swipeCoordinator = useCreateSwipeCoordinator();

  const { startEdit, startCreate, startFromPlan } = useWorkoutFormStore();

  const closeOpenSwipeRow = useCallback(
    () => swipeCoordinator.closeAll(),
    [swipeCoordinator],
  );

  const openDetail = useCallback(
    (w: Workout) => {
      if (w.workoutId == null) return;
      router.push(("/workouts/" + String(w.workoutId)) as Href);
    },
    [router],
  );

  const openLog = useCallback(() => {
    router.push("/workout-log" as Href);
  }, [router]);

  const openRoutines = useCallback(() => {
    router.push("/start-workout" as Href);
  }, [router]);

  // /workout-plans/assigned is athlete-only and 403s for trainers, so the query
  // is gated on role — a trainer just gets the menu without the routine entry.
  const isAthlete = useAuthStore((s) => s.user?.role === "athlete");

  const { data: planData } = useQuery({
    queryKey: ["myPlans"],
    queryFn: () => workoutPlanApi.getMyPlans(),
    enabled: isAthlete,
  });

  // The most recently touched assigned routine — the best "jump back in" default.
  const lastPlan = useMemo<WorkoutPlan | undefined>(() => {
    const plans = (planData as { plans?: WorkoutPlan[] } | undefined)?.plans ?? [];
    if (plans.length === 0) return undefined;
    return [...plans].sort((a, b) => {
      const aStamp = Date.parse(a.updatedAt ?? a.createdAt ?? "") || 0;
      const bStamp = Date.parse(b.updatedAt ?? b.createdAt ?? "") || 0;
      return bStamp - aStamp;
    })[0];
  }, [planData]);

  const fabMenuActions = useMemo<FabMenuAction[]>(
    () =>
      [
        { id: "routines", title: t("workout.start.menu_my_routines") },
        ...(lastPlan
          ? [
              {
                id: "plan",
                title: t("workout.start.menu_last_plan", { name: lastPlan.name }),
              },
            ]
          : []),
        { id: "empty", title: t("workout.start.empty_workout") },
      ] as FabMenuAction[],
    [t, lastPlan],
  );

  const handleFabMenuAction = useCallback(
    (id: string) => {
      triggerHaptic();
      switch (id) {
        case "routines":
          openRoutines();
          return;
        case "plan":
          if (!lastPlan) return;
          startFromPlan(lastPlan);
          openLog();
          return;
        case "empty":
          startCreate();
          openLog();
          return;
      }
    },
    [openRoutines, openLog, lastPlan, startCreate, startFromPlan],
  );

  const openEdit = useCallback(
    (workout: Workout) => {
      startEdit(workout);
      router.push("/workout-log" as Href);
    },
    [startEdit, router],
  );

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useQuery<WorkoutListResponse>({
      queryKey: ["workouts", "list"],
      queryFn: () => workoutApi.getAll() as Promise<WorkoutListResponse>,
    });

  const workouts = useMemo(() => data?.workouts ?? [], [data]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => workoutApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts", "list"] });
    },
    onError: (err: Error) => {
      Alert.alert(t("common.errors.generic"), err.message);
    },
  });

  const handleDelete = useCallback(
    (workout: Workout) => {
      const id = workout.workoutId;
      if (id == null) return;
      Alert.alert(
        t("workout.delete_dialog.title"),
        t("workout.delete_dialog.description"),
        [
          { text: t("workout.delete_dialog.cancel"), style: "cancel" },
          {
            text: t("workout.delete_dialog.confirm"),
            style: "destructive",
            onPress: () => deleteMutation.mutate(id),
          },
        ],
      );
    },
    [t, deleteMutation],
  );

  const renderItem = useCallback(
    ({ item }: { item: Workout }) => (
      <WorkoutCard
        workout={item}
        editable={canEdit(item.createdAt)}
        onOpen={openDetail}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
    ),
    [openDetail, openEdit, handleDelete],
  );

  const keyExtractor = useCallback(
    (item: Workout) => String(item.workoutId ?? item.date),
    [],
  );

  if (isLoading) {
    return (
      <Box className="flex-1 items-center justify-center bg-background p-6">
        <Spinner />
        <Text className="mt-3 text-[15px] text-text-secondary">
          {t("common.loading")}
        </Text>
      </Box>
    );
  }

  if (isError && workouts.length === 0) {
    if (isSessionExpiredError(error)) {
      return <SessionExpiredView message={(error as Error)?.message} />;
    }
    return (
      <Box className="flex-1 items-center justify-center bg-background p-6">
        <Text className="mb-4 text-center text-[15px] text-danger">
          {(error as Error)?.message || t("common.errors.generic")}
        </Text>
        <Host matchContents>
          <Button label={t("common.actions.retry")} onPress={() => refetch()} />
        </Host>
      </Box>
    );
  }

  return (
    <SwipeCoordinatorProvider value={swipeCoordinator}>
    <Box className="flex-1 bg-background">
      <FlashList
        data={workouts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onScrollBeginDrag={closeOpenSwipeRow}
        contentContainerStyle={
          workouts.length === 0
            ? { flexGrow: 1, justifyContent: "center", padding: 16 }
            : { padding: 16, paddingBottom: 100 }
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <Box className="items-center py-10">
            <Text className="mb-3 text-5xl">{"\u{1F3CB}"}</Text>
            <Text className="text-center text-base text-text-secondary">
              {t("workout.list.no_workouts")}
            </Text>
          </Box>
        }
      />

      {/* FAB — menu of ways to start a workout */}
      <View className="absolute bottom-6 right-6">
        <FabMenu
          actions={fabMenuActions}
          onSelect={handleFabMenuAction}
          title={t("workout.start.title")}
          accessibilityLabel={t("athlete.workouts.log_workout")}
          size="lg"
          className="bg-primary"
          testID="workouts-fab"
        >
          <Icon as={AddIcon} size="xl" className="h-7 w-7 text-primary-foreground" />
        </FabMenu>
      </View>
    </Box>
    </SwipeCoordinatorProvider>
  );
}
