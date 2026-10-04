import { useCallback, useMemo } from "react";
import { Alert, Platform, RefreshControl, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

import { useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/stores/authStore";
import { useWorkoutFormStore } from "@/stores/workout-form-store";
import { workoutPlanApi } from "@/api/workoutPlanApi";
import { isSessionExpiredError } from "@/api/client";
import type { WorkoutPlan } from "@/types";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { Spinner } from "@/components/ui/spinner";
import { Center } from "@/components/ui/center";
import {
  Icon,
  AddIcon,
  ChevronLeftIcon,
  ClockIcon,
  ThreeDotsIcon,
} from "@/components/ui/icon";
import { SessionExpiredView } from "@/components/features/auth/SessionExpiredView";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function triggerHaptic() {
  if (Platform.OS === "ios") {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

function planDescription(plan: WorkoutPlan): string {
  const description = plan.description?.trim();
  if (description) return description;
  return (plan.exercises ?? [])
    .map((exercise) => exercise.name)
    .filter(Boolean)
    .join(", ");
}

function planMetaLabel(plan: WorkoutPlan, fallback: string): string {
  const stamp = plan.updatedAt ?? plan.createdAt;
  if (stamp) {
    const date = new Date(stamp);
    if (!Number.isNaN(date.getTime())) return dateFormatter.format(date);
  }
  return fallback;
}

interface RoutineCardProps {
  plan: WorkoutPlan;
  onOpen: (plan: WorkoutPlan) => void;
  onOptions: (plan: WorkoutPlan) => void;
}

function RoutineCard({ plan, onOpen, onOptions }: RoutineCardProps) {
  const { t } = useI18n();
  const meta = planMetaLabel(
    plan,
    t("workout.start.exercises_count", {
      count: plan.exercises?.length ?? 0,
    }),
  );

  return (
    <Pressable
      onPress={() => {
        triggerHaptic();
        onOpen(plan);
      }}
      accessibilityRole="button"
      accessibilityLabel={plan.name}
      accessibilityHint={t("workout.start.start_routine")}
      className="min-h-[140px] flex-1 basis-[47%] rounded-2xl border border-border bg-card p-4 active:opacity-70"
    >
      <HStack className="items-start gap-1">
        <Text
          className="flex-1 text-[15px] font-bold leading-5 text-text"
          numberOfLines={2}
        >
          {plan.name}
        </Text>
        <Pressable
          onPress={() => {
            triggerHaptic();
            onOptions(plan);
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("workout.start.routine_options")}
          className="-mr-1 -mt-1 h-7 w-7 items-center justify-center rounded-full active:bg-surface-subtle"
        >
          <Icon as={ThreeDotsIcon} size="sm" className="text-text-tertiary" />
        </Pressable>
      </HStack>

      <Text
        className="mt-1.5 text-[12px] leading-4 text-text-secondary"
        numberOfLines={2}
      >
        {planDescription(plan) || "—"}
      </Text>

      <HStack className="mt-auto items-center gap-1 pt-3">
        <Icon as={ClockIcon} size="2xs" className="text-text-tertiary" />
        <Text className="text-[11px] text-text-tertiary" numberOfLines={1}>
          {meta}
        </Text>
      </HStack>
    </Pressable>
  );
}

export function StartWorkoutScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const startCreate = useWorkoutFormStore((s) => s.startCreate);
  const startFromPlan = useWorkoutFormStore((s) => s.startFromPlan);

  const isTrainer = user?.role === "trainer";
  const manageRoute: Href = isTrainer
    ? "/trainer/plans"
    : "/athlete/workout-plans";

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["myPlans"],
    queryFn: () => workoutPlanApi.getMyPlans(),
  });

  const plans = useMemo<WorkoutPlan[]>(
    () => (data as { plans?: WorkoutPlan[] } | undefined)?.plans ?? [],
    [data],
  );

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/workouts");
    }
  }, [router]);

  const openLog = useCallback(() => {
    router.push("/workout-log" as Href);
  }, [router]);

  const handleEmpty = useCallback(() => {
    triggerHaptic();
    startCreate();
    openLog();
  }, [startCreate, openLog]);

  const handleStartPlan = useCallback(
    (plan: WorkoutPlan) => {
      triggerHaptic();
      startFromPlan(plan);
      openLog();
    },
    [startFromPlan, openLog],
  );

  const handleOptions = useCallback(
    (plan: WorkoutPlan) => {
      Alert.alert(plan.name, undefined, [
        {
          text: t("workout.start.start_routine"),
          onPress: () => handleStartPlan(plan),
        },
        {
          text: t("workout.start.view_plan"),
          onPress: () => router.push(`/trainer/plans/${plan.planId}` as Href),
        },
        { text: t("common.actions.cancel"), style: "cancel" },
      ]);
    },
    [t, handleStartPlan, router],
  );

  const handleManage = useCallback(() => {
    triggerHaptic();
    router.push(manageRoute);
  }, [router, manageRoute]);

  if (isSessionExpiredError(error)) {
    return <SessionExpiredView message={(error as Error)?.message} />;
  }

  return (
    <Box className="flex-1 bg-background">
      <HStack
        className="items-center px-2 pt-1"
        style={{ paddingTop: insets.top + 4 }}
      >
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={t("common.actions.back")}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-surface-subtle"
        >
          <Icon as={ChevronLeftIcon} size="lg" className="text-text" />
        </Pressable>
      </HStack>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 16,
          paddingTop: 4,
          paddingBottom: 40 + insets.bottom,
          gap: 24,
        }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        <Text className="text-[30px] font-extrabold leading-9 text-text">
          {t("workout.start.title")}
        </Text>

        <Box>
          <Text className="text-[15px] font-semibold text-text">
            {t("workout.start.quick_start")}
          </Text>
          <Pressable
            onPress={handleEmpty}
            accessibilityRole="button"
            accessibilityLabel={t("workout.start.empty_workout")}
            className="mt-3 min-h-[52px] items-center justify-center rounded-xl bg-primary active:opacity-80"
          >
            <Text className="text-[16px] font-bold text-primary-foreground">
              {t("workout.start.empty_workout")}
            </Text>
          </Pressable>
        </Box>

        <Box>
          <HStack className="items-center">
            <Text className="flex-1 text-[24px] font-bold text-text">
              {t("workout.start.routines")}
            </Text>
            {isTrainer ? (
              <Pressable
                onPress={handleManage}
                accessibilityRole="button"
                accessibilityLabel={t("workout.start.add_routine")}
                className="min-h-[36px] flex-row items-center gap-0.5 rounded-full px-2 active:opacity-70"
              >
                <Icon as={AddIcon} size="sm" className="text-primary" />
                <Text className="text-[15px] font-semibold text-primary">
                  {t("workout.start.add_routine")}
                </Text>
              </Pressable>
            ) : null}
          </HStack>

          <HStack className="mt-4 items-center">
            <Text className="flex-1 text-[15px] font-semibold text-text-secondary">
              {t("workout.start.my_routines", { count: plans.length })}
            </Text>
            <Pressable
              onPress={handleManage}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("workout.start.manage_routines")}
              className="h-9 w-9 items-center justify-center rounded-full active:bg-surface-subtle"
            >
              <Icon
                as={ThreeDotsIcon}
                size="md"
                className="text-text-secondary"
              />
            </Pressable>
          </HStack>

          {isLoading ? (
            <Center className="py-10">
              <Spinner />
            </Center>
          ) : isError ? (
            <Box className="mt-4 items-center rounded-2xl border border-border bg-card p-6">
              <Text className="mb-3 text-center text-[15px] text-danger">
                {t("workout.start.load_failed")}
              </Text>
              <Pressable
                onPress={() => refetch()}
                accessibilityRole="button"
                accessibilityLabel={t("common.actions.retry")}
                className="min-h-[44px] items-center justify-center rounded-xl bg-brand-surface px-5 active:opacity-80"
              >
                <Text className="text-[15px] font-semibold text-brand-on-light">
                  {t("common.actions.retry")}
                </Text>
              </Pressable>
            </Box>
          ) : plans.length === 0 ? (
            <Box className="mt-4 rounded-2xl border border-dashed border-border bg-card p-6">
              <Text className="text-center text-[14px] leading-5 text-text-secondary">
                {t("workout.start.no_routines")}
              </Text>
            </Box>
          ) : (
            <Box className="mt-4 flex-row flex-wrap gap-3">
              {plans.map((plan) => (
                <RoutineCard
                  key={String(plan.planId ?? plan.name)}
                  plan={plan}
                  onOpen={handleStartPlan}
                  onOptions={handleOptions}
                />
              ))}
            </Box>
          )}
        </Box>
      </ScrollView>
    </Box>
  );
}
