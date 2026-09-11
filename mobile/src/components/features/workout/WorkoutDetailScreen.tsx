import React, { useCallback, useMemo } from "react";
import { RefreshControl } from "react-native";
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { workoutApi } from "@/api/workoutApi";
import { useI18n } from "@/lib/i18n";
import { CommentSection } from "@/components/features/comments/CommentSection";
import type { Workout, WorkoutExercise, ExerciseSet } from "@/types";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Button, Host } from "@expo/ui";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import { Center } from "@/components/ui/center";

interface ExerciseCardProps {
  exercise: WorkoutExercise;
}

const ExerciseCard = React.memo(function ExerciseCard({
  exercise,
}: ExerciseCardProps) {
  return (
    <Box
      className="rounded-[10px] border border-border bg-card p-3.5"
      accessibilityLabel={`${exercise.name}, ${exercise.sets?.length ?? 0} sets`}
    >
      <Text className="text-base font-semibold text-text">
        {exercise.name}
      </Text>
      {exercise.notes ? (
        <Text className="mt-1 text-[13px] italic text-text-tertiary">
          {exercise.notes}
        </Text>
      ) : null}
      {(exercise.sets ?? []).map((set: ExerciseSet, idx: number) => (
        <HStack
          key={set.setId ?? `set-${idx}`}
          space="sm"
          className="mt-1.5 items-center"
        >
          <Text className="w-7 text-[13px] text-text-tertiary">
            #{idx + 1}
          </Text>
          <Text className="text-sm font-medium text-text-body">
            {set.weight ?? 0} {set.weightUnit ?? "kg"} {"\u00D7"} {set.reps ?? 0}{" "}
            reps
          </Text>
        </HStack>
      ))}
    </Box>
  );
});

export function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<Workout>({
    queryKey: ["workout", id],
    queryFn: () => workoutApi.getById(id!) as Promise<Workout>,
    enabled: !!id,
  });

  const formattedDate = useMemo(() => {
    if (!data?.date) return "";
    return new Date(data.date).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [data?.date]);

  const stats = useMemo(() => {
    const exercises = data?.exercises ?? [];
    const totalExercises = exercises.length;
    const totalSets = exercises.reduce(
      (acc, ex) => acc + (ex.sets?.length ?? 0),
      0
    );
    const totalReps = exercises.reduce(
      (acc, ex) =>
        acc + (ex.sets?.reduce((s, set) => s + (set.reps ?? 0), 0) ?? 0),
      0
    );
    const totalVolume = exercises.reduce(
      (acc, ex) =>
        acc +
        (ex.sets?.reduce(
          (s, set) => s + (set.weight ?? 0) * (set.reps ?? 0),
          0
        ) ?? 0),
      0
    );
    const weightUnit =
      data?.exercises?.[0]?.sets?.[0]?.weightUnit ?? "kg";
    return { totalExercises, totalSets, totalReps, totalVolume, weightUnit };
  }, [data?.exercises]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const renderExercise = useCallback(
    ({ item }: ListRenderItemInfo<WorkoutExercise>) => (
      <ExerciseCard exercise={item} />
    ),
    []
  );

  const keyExtractor = useCallback(
    (item: WorkoutExercise, index: number) =>
      String(item.exerciseId ?? `exercise-${index}`),
    []
  );

  const headerComponent = useMemo(
    () => (
      <Box className="px-5 pb-4 pt-2">
        <Pressable
          onPress={handleBack}
          className="self-start py-1.5"
          accessibilityRole="button"
          accessibilityLabel={t("common.actions.back")}
        >
          <Text className="text-base font-semibold text-primary">
            {"\u2039"} {t("common.actions.back")}
          </Text>
        </Pressable>

        <Text className="mb-1 mt-2 text-[22px] font-bold text-text">
          {formattedDate}
        </Text>

        <HStack className="mb-4 mt-3 gap-3">
          <Box className="flex-1 items-center rounded-lg bg-surface-subtle p-2.5">
            <Text className="text-lg font-bold text-text">
              {String(stats.totalSets)}
            </Text>
            <Text className="text-[11px] text-text-tertiary">
              {t("workout.form.exercise.sets.label")}
            </Text>
          </Box>
          <Box className="flex-1 items-center rounded-lg bg-surface-subtle p-2.5">
            <Text className="text-lg font-bold text-text">
              {String(stats.totalReps)}
            </Text>
            <Text className="text-[11px] text-text-tertiary">
              {t("workout.form.exercise.reps.label")}
            </Text>
          </Box>
          <Box className="flex-1 items-center rounded-lg bg-surface-subtle p-2.5">
            <Text className="text-lg font-bold text-text">
              {String(stats.totalVolume)}
            </Text>
            <Text className="text-[11px] text-text-tertiary">
              {`Vol (${stats.weightUnit})`}
            </Text>
          </Box>
        </HStack>

        <Text className="mb-3 text-sm font-bold uppercase tracking-[1px] text-text-secondary">
          {t("workout.list.exercises")} ({stats.totalExercises})
        </Text>
      </Box>
    ),
    [formattedDate, handleBack, stats, t]
  );

  // CommentSection renders a non-virtualized list (scrollEnabled=false),
  // so nesting it inside FlashList's footer causes no scroll conflict.
  const footerComponent = useMemo(
    () => (
      <Box className="px-5 pt-4">
        <CommentSection targetType="workout" targetId={id!} />
      </Box>
    ),
    [id]
  );

  if (isLoading) {
    return (
      <Center className="flex-1 bg-background">
        <Spinner size="large" />
      </Center>
    );
  }

  if (isError || !data) {
    return (
      <Center className="flex-1 bg-background p-6">
        <Text className="mb-3 text-center text-[15px] text-danger">
          {t("workout.detail.load_failed")}
        </Text>
        <Host matchContents>
          <Button label={t("common.actions.retry")} onPress={handleRefresh} />
        </Host>
      </Center>
    );
  }

  return (
    <Box className="flex-1 bg-background">
      <FlashList
        data={data.exercises ?? []}
        renderItem={renderExercise}
        keyExtractor={keyExtractor}
        ListHeaderComponent={headerComponent}
        ListFooterComponent={footerComponent}
        contentContainerStyle={{ paddingBottom: 24 }}
        ItemSeparatorComponent={() => <Box className="h-2" />}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
        }
        estimatedItemSize={100}
      />
    </Box>
  );
}
