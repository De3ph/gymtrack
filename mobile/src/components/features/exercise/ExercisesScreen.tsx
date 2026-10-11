import React, { useCallback, useDeferredValue, useMemo, useState } from "react";
import { RefreshControl, useWindowDimensions } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Animated, {
  Easing,
  FadeInDown,
  useReducedMotion,
} from "react-native-reanimated";
import { exerciseApi } from "@/api/exerciseApi";
import { isSessionExpiredError } from "@/api/client";
import { useI18n } from "@/lib/i18n";
import type {
  Equipment,
  ExerciseLibrary,
  MuscleGroup,
} from "@/types";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Button, Host } from "@expo/ui";
import { Spinner } from "@/components/ui/spinner";
import { useAppColors } from "@/lib/colors";
import { SessionExpiredView } from "@/components/features/auth/SessionExpiredView";
import { ExerciseLibraryCard } from "./ExerciseLibraryCard";
import {
  ExerciseLibraryFilters,
  type ExerciseLibraryFilterState,
} from "./ExerciseLibraryFilters";

const EMPTY_EXERCISES: ExerciseLibrary[] = [];
const EMPTY_MUSCLE_GROUPS: MuscleGroup[] = [];
const EMPTY_EQUIPMENT: Equipment[] = [];
const EMPTY_FILTERS: ExerciseLibraryFilterState = { query: "" };

// Web staggers grid tiles by 30ms with an 8px rise over 200ms
// (`exerciseStagger` / `exerciseReveal`). Same numbers here via reanimated.
const ENTER_EASING = Easing.bezier(0.23, 1, 0.32, 1);
const ENTER_OFFSET = 8;

function useEnterAnimation(index: number, reducedMotion: boolean) {
  return useMemo(() => {
    if (reducedMotion) return FadeInDown.duration(120);
    return FadeInDown.withInitialValues({
      transform: [{ translateY: ENTER_OFFSET }],
    })
      .duration(200)
      .delay(Math.min(index, 12) * 30)
      .easing(ENTER_EASING);
  }, [index, reducedMotion]);
}

const ExerciseGridItem = React.memo(function ExerciseGridItem({
  item,
  index,
}: {
  item: ExerciseLibrary;
  index: number;
}) {
  const reducedMotion = useReducedMotion();
  const entering = useEnterAnimation(index, reducedMotion);
  return (
    <Animated.View entering={entering} className="mb-3 flex-1 px-1.5">
      <ExerciseLibraryCard exercise={item} />
    </Animated.View>
  );
});

/**
 * Exercise library list. Mirrors web `ExercisesClient` + `page.tsx`:
 * - Fetches catalog + both lookup tables in parallel via React Query (web
 *   does it once server-side with cached DAL reads; mobile has no RSC, so
 *   three parallel queries with a 5-min staleTime play the same role).
 * - Enriches rows once via lookup Maps (web comment: typing is O(n·m)
 *   without this).
 * - Filters entirely client-side with a deferred query (typing stays
 *   responsive; filtering never costs a round trip).
 */
export function ExercisesScreen() {
  const { t } = useI18n();
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [filters, setFilters] =
    useState<ExerciseLibraryFilterState>(EMPTY_FILTERS);

  const deferredQuery = useDeferredValue(filters.query);

  const exercisesQuery = useQuery({
    queryKey: ["exercises", "catalog"],
    queryFn: () => exerciseApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });
  const muscleGroupsQuery = useQuery({
    queryKey: ["exercises", "muscle-groups"],
    queryFn: () => exerciseApi.getMuscleGroups(),
    staleTime: 30 * 60 * 1000,
  });
  const equipmentQuery = useQuery({
    queryKey: ["exercises", "equipment"],
    queryFn: () => exerciseApi.getEquipment(),
    staleTime: 30 * 60 * 1000,
  });

  const rawExercises = useMemo(
    () =>
      Array.isArray(exercisesQuery.data)
        ? exercisesQuery.data
        : EMPTY_EXERCISES,
    [exercisesQuery.data],
  );
  const muscleGroups = useMemo(
    () =>
      Array.isArray(muscleGroupsQuery.data)
        ? muscleGroupsQuery.data
        : EMPTY_MUSCLE_GROUPS,
    [muscleGroupsQuery.data],
  );
  const equipmentList = useMemo(
    () =>
      Array.isArray(equipmentQuery.data)
        ? equipmentQuery.data
        : EMPTY_EQUIPMENT,
    [equipmentQuery.data],
  );

  const exercises = useMemo<ExerciseLibrary[]>(() => {
    const muscleGroupById = new Map(
      muscleGroups
        .filter((g) => typeof g.id === "number")
        .map((g) => [g.id as number, g]),
    );
    const equipmentById = new Map(
      equipmentList
        .filter((e) => typeof e.id === "number")
        .map((e) => [e.id as number, e]),
    );
    return rawExercises.map((exercise) => ({
      ...exercise,
      muscleGroup:
        exercise.muscleGroupId !== undefined
          ? muscleGroupById.get(exercise.muscleGroupId)
          : undefined,
      equipment:
        exercise.equipmentId !== undefined
          ? equipmentById.get(exercise.equipmentId)
          : undefined,
    }));
  }, [rawExercises, muscleGroups, equipmentList]);

  const categories = useMemo(() => {
    const unique = new Set<string>();
    for (const exercise of exercises) {
      if (exercise.category) unique.add(exercise.category);
    }
    return [...unique].sort();
  }, [exercises]);

  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    return exercises.filter((exercise) => {
      if (
        needle &&
        !exercise.name.toLowerCase().includes(needle) &&
        !(exercise.instructions ?? "").toLowerCase().includes(needle)
      ) {
        return false;
      }
      if (
        filters.muscleGroupId !== undefined &&
        exercise.muscleGroupId !== filters.muscleGroupId
      ) {
        return false;
      }
      if (
        filters.equipmentId !== undefined &&
        exercise.equipmentId !== filters.equipmentId
      ) {
        return false;
      }
      if (
        filters.category !== undefined &&
        exercise.category !== filters.category
      ) {
        return false;
      }
      return true;
    });
  }, [
    exercises,
    deferredQuery,
    filters.muscleGroupId,
    filters.equipmentId,
    filters.category,
  ]);

  const handleFilterChange = useCallback((next: ExerciseLibraryFilterState) => {
    setFilters(next);
  }, []);

  const handleRetry = useCallback(() => {
    void exercisesQuery.refetch();
    void muscleGroupsQuery.refetch();
    void equipmentQuery.refetch();
  }, [exercisesQuery, muscleGroupsQuery, equipmentQuery]);

  const renderItem = useCallback(
    ({ item, index }: { item: ExerciseLibrary; index: number }) => (
      <ExerciseGridItem item={item} index={index} />
    ),
    [],
  );

  const keyExtractor = useCallback(
    (item: ExerciseLibrary) => String(item.exerciseId),
    [],
  );

  const isLoading =
    exercisesQuery.isLoading ||
    muscleGroupsQuery.isLoading ||
    equipmentQuery.isLoading;
  const isRefetching =
    exercisesQuery.isRefetching ||
    muscleGroupsQuery.isRefetching ||
    equipmentQuery.isRefetching;
  const error =
    exercisesQuery.error ?? muscleGroupsQuery.error ?? equipmentQuery.error;
  const isError =
    exercisesQuery.isError ||
    muscleGroupsQuery.isError ||
    equipmentQuery.isError;

  // Two columns on phones, three on tablets — web grid is 1/2/3 cols.
  const numColumns = width >= 768 ? 3 : 2;

  if (isLoading) {
    return (
      <Box
        className="flex-1 items-center justify-center bg-background p-6"
        style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom }}
      >
        <Spinner size="large" />
        <Text className="mt-3 text-[15px] text-text-secondary">
          {t("common.loading")}
        </Text>
      </Box>
    );
  }

  if (isError && exercises.length === 0) {
    if (error && isSessionExpiredError(error as unknown as Error)) {
      return <SessionExpiredView message={(error as Error)?.message} />;
    }
    return (
      <Box
        className="flex-1 items-center justify-center bg-background p-6"
        style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom }}
      >
        <MaterialCommunityIcons
          name="dumbbell"
          size={40}
          color={colors.textTertiary}
        />
        <Text className="mb-4 mt-3 text-center text-[15px] text-danger">
          {(error as Error)?.message ||
            t("common.errors.failed_load_exercises")}
        </Text>
        <Host matchContents>
          <Button
            label={t("common.actions.retry")}
            onPress={handleRetry}
          />
        </Host>
      </Box>
    );
  }

  return (
    <Box className="flex-1 bg-background">
      <FlashList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={numColumns}
        contentContainerStyle={{
          padding: 16,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 32,
        }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRetry} />
        }
        ListHeaderComponent={
          <Box className="mb-3 gap-3 px-1.5">
            <Box className="gap-1">
              <Text className="text-2xl font-semibold tracking-tight text-text">
                {t("exercise.library.title")}
              </Text>
              <Text className="text-sm text-text-secondary">
                {t("exercise.library.subtitle")}
              </Text>
            </Box>
            <ExerciseLibraryFilters
              value={filters}
              categories={categories}
              muscleGroups={muscleGroups}
              equipment={equipmentList}
              resultCount={filtered.length}
              totalCount={exercises.length}
              onChange={handleFilterChange}
            />
          </Box>
        }
        ListEmptyComponent={
          <Box className="items-center justify-center border border-border bg-card px-6 py-12">
            <MaterialCommunityIcons
              name="magnify-close"
              size={28}
              color={colors.textTertiary}
            />
            <Text className="mt-3 text-center text-[10px] uppercase tracking-[1.8px] text-text">
              {t("exercise.filters.no_results")}
            </Text>
            <Text className="mt-1.5 text-center text-[13px] text-text-secondary">
              {exercises.length === 0
                ? t("exercise.library.catalog_empty")
                : t("exercise.library.no_results_hint")}
            </Text>
          </Box>
        }
      />
    </Box>
  );
}
