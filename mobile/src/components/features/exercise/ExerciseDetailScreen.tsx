import React, { useCallback, useMemo } from "react";
import { RefreshControl, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { exerciseApi } from "@/api/exerciseApi";
import { isSessionExpiredError } from "@/api/client";
import { useI18n } from "@/lib/i18n";
import { triggerHaptic } from "@/lib/haptics";
import type { ExerciseLibrary } from "@/types";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Button, Host } from "@expo/ui";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import { useAppColors } from "@/lib/colors";
import { SessionExpiredView } from "@/components/features/auth/SessionExpiredView";
import { ExerciseMediaPanel } from "./ExerciseMediaPanel";
import { ExerciseInstructions } from "./ExerciseInstructions";
import { ExerciseBadges } from "./ExerciseBadges";
import { Badge, BadgeText } from "@/components/ui/badge";

/**
 * Exercise detail:
 * - Numeric-id guard (web: non-numeric id → notFound without a round trip).
 * - Detail query + both lookup tables in parallel; the full catalog is NOT
 *   fetched (the detail page has no use for it).
 * - 404 → themed not-found view; any other failure → retryable error view
 *   (web `DataError`). A backend outage must never read as "does not exist".
 * - Title with detail chips (category/muscle/equipment) directly underneath,
 *   then the demonstration hero and numbered instructions.
 *
 * Note on expo-ui: @expo/ui ships no static badge/chip component (only
 * interactive Button/Switch/etc. via Host), so the chips use the app's
 * gluestack badge system, matching the library cards.
 */
export function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const colors = useAppColors();
  const insets = useSafeAreaInsets();

  const isNumericId = typeof id === "string" && /^\d+$/.test(id);

  const exerciseQuery = useQuery({
    queryKey: ["exercise", id],
    queryFn: () => exerciseApi.getById(id!),
    enabled: isNumericId,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, err) => {
      // A genuine 404 is final — retrying it is a pointless round trip.
      if ((err as Error)?.message?.includes("404")) return false;
      return failureCount < 1;
    },
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

  const handleBack = useCallback(() => {
    triggerHaptic();
    if (router.canGoBack()) router.back();
    else router.replace("/exercises");
  }, [router]);

  const handleRetry = useCallback(() => {
    void exerciseQuery.refetch();
    void muscleGroupsQuery.refetch();
    void equipmentQuery.refetch();
  }, [exerciseQuery, muscleGroupsQuery, equipmentQuery]);

  const exercise = useMemo<ExerciseLibrary | undefined>(() => {
    const data = exerciseQuery.data;
    if (!data) return undefined;
    const muscleGroups = Array.isArray(muscleGroupsQuery.data)
      ? muscleGroupsQuery.data
      : [];
    const equipmentList = Array.isArray(equipmentQuery.data)
      ? equipmentQuery.data
      : [];
    return {
      ...data,
      muscleGroup: muscleGroups.find((g) => g.id === data.muscleGroupId),
      equipment: equipmentList.find((e) => e.id === data.equipmentId),
    };
  }, [exerciseQuery.data, muscleGroupsQuery.data, equipmentQuery.data]);

  const isNotFound =
    isNumericId &&
    (exerciseQuery.error as Error | null)?.message?.includes("404");

  if (!isNumericId || (isNotFound && !exerciseQuery.isLoading)) {
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
        <Text className="mt-3 text-center text-[15px] font-semibold text-text">
          {t("common.errors.not_found")}
        </Text>
        <Box className="mt-5">
          <Host matchContents>
            <Button label={t("common.actions.back")} onPress={handleBack} />
          </Host>
        </Box>
      </Box>
    );
  }

  const isLoading =
    exerciseQuery.isLoading ||
    muscleGroupsQuery.isLoading ||
    equipmentQuery.isLoading;

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

  const error =
    exerciseQuery.error ?? muscleGroupsQuery.error ?? equipmentQuery.error;
  if ((exerciseQuery.isError || !exercise) && error) {
    if (isSessionExpiredError(error)) {
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
          {(error as Error)?.message || t("common.errors.failed_load_exercises")}
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

  if (!exercise) return null;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        padding: 20,
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 32,
      }}
      refreshControl={
        <RefreshControl
          refreshing={exerciseQuery.isRefetching}
          onRefresh={handleRetry}
        />
      }
    >
      <Pressable
        onPress={handleBack}
        accessibilityRole="button"
        accessibilityLabel={t("common.actions.back")}
        className="mb-6 w-fit flex-row items-center gap-2 self-start rounded-md border border-border px-3 py-2 active:bg-surface-subtle"
      >
        <MaterialCommunityIcons
          name="arrow-left"
          size={18}
          color={colors.text}
        />
        <Text className="text-[10px] uppercase tracking-[1.8px] text-text">
          {t("common.actions.back")}
        </Text>
      </Pressable>

      <Box className="gap-3">
        <Text className="text-2xl font-semibold leading-tight tracking-tight text-text">
          {exercise.name}
        </Text>
        <Box className="flex-row flex-wrap gap-1.5">
          {exercise.category?.trim() ? (
            <Badge variant="outline" className="rounded-md bg-transparent">
              <BadgeText className="text-[9px] uppercase tracking-[1.8px] text-text-secondary">
                {exercise.category.trim()}
              </BadgeText>
            </Badge>
          ) : null}
          <ExerciseBadges
            muscleGroup={exercise.muscleGroup}
            equipment={exercise.equipment}
          />
        </Box>
      </Box>

      <Box className="mt-6">
        <ExerciseMediaPanel exercise={exercise} size="detail" />
      </Box>

      <Box className="mt-6">
        <ExerciseInstructions instructions={exercise.instructions} />
      </Box>
    </ScrollView>
  );
}

