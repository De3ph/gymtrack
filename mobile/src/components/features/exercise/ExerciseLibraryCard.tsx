import React, { useCallback } from "react";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useI18n } from "@/lib/i18n";
import { triggerHaptic } from "@/lib/haptics";
import type { ExerciseLibrary } from "@/types";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { useAppColors } from "@/lib/colors";
import { ExerciseMediaPanel } from "./ExerciseMediaPanel";
import { ExerciseBadges } from "./ExerciseBadges";

interface ExerciseLibraryCardProps {
  exercise: ExerciseLibrary;
}

/**
 * Grid card for the exercise library. The whole tile is the hit target
 * (single Pressable → detail route): media on top, name plus badges below.
 * Badges are plain views, so the tile stays the only accessibility action.
 */
export const ExerciseLibraryCard = React.memo(function ExerciseLibraryCard({
  exercise,
}: ExerciseLibraryCardProps) {
  const { t } = useI18n();
  const router = useRouter();
  const colors = useAppColors();

  const handlePress = useCallback(() => {
    triggerHaptic();
    router.push(`/exercises/${exercise.exerciseId}`);
  }, [router, exercise.exerciseId]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={exercise.name}
      accessibilityHint={t("common.actions.view")}
      className="flex-1 overflow-hidden rounded-xl border border-border bg-card active:bg-surface-subtle"
    >
      <Box className="relative">
        <ExerciseMediaPanel exercise={exercise} size="card" />
        {exercise.mediaUrl ? (
          <Box className="absolute right-2 top-2 h-7 w-7 items-center justify-center rounded-md border border-border bg-card/90">
            <MaterialCommunityIcons
              name="arrow-top-right"
              size={16}
              color={colors.textSecondary}
            />
          </Box>
        ) : null}
      </Box>

      <Box className="gap-3 p-5">
        <Text className="text-sm font-semibold leading-tight text-text" numberOfLines={2}>
          {exercise.name}
        </Text>

        <Box className="flex-row flex-wrap gap-1.5">
          <ExerciseBadges
            muscleGroup={exercise.muscleGroup}
            equipment={exercise.equipment}
          />
        </Box>
      </Box>
    </Pressable>
  );
});
