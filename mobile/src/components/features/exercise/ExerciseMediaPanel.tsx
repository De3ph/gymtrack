import React, { useState } from "react";
import { Image } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useI18n } from "@/lib/i18n";
import type { ExerciseLibrary } from "@/types";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { useAppColors } from "@/lib/colors";

interface ExerciseMediaPanelProps {
  exercise: ExerciseLibrary;
  /** Small tile for a list card; full-bleed frame for the detail page. */
  size?: "card" | "detail";
}

/**
 * Renders an exercise's demonstration asset. Mirrors web `ExerciseMediaPanel`:
 * gif/image renders via RN `Image`, missing media (or a load failure) renders
 * the same labelled placeholder.
 *
 * Video is intentionally NOT played inline: `expo-video` is not installed and
 * the web contract treats `mediaType: "video"` as the only renderer needing a
 * `<video>` element. A video URL therefore degrades to the placeholder instead
 * of a broken frame — same failure path as a dead CDN link on web.
 */
export const ExerciseMediaPanel = React.memo(function ExerciseMediaPanel({
  exercise,
  size = "detail",
}: ExerciseMediaPanelProps) {
  const { t } = useI18n();
  const colors = useAppColors();
  const [hasError, setHasError] = useState(false);

  const mediaType = exercise.mediaType ?? "gif";
  const hasMedia =
    Boolean(exercise.mediaUrl) && !hasError && mediaType !== "video";
  const isDetail = size === "detail";

  if (!hasMedia) {
    return (
      <Box
        className={
          isDetail
            ? "aspect-video w-full items-center justify-center border border-border bg-surface-subtle"
            : "aspect-[4/3] w-full items-center justify-center border-b border-border bg-surface-subtle"
        }
        testID="exercise-media-placeholder"
      >
        <Box className="items-center gap-2 px-4">
          <MaterialCommunityIcons
            name="dumbbell"
            size={isDetail ? 40 : 28}
            color={colors.textTertiary}
          />
          <Text className="text-center text-[10px] uppercase tracking-[1.8px] text-text-tertiary">
            {t("exercise.library.no_media")}
          </Text>
        </Box>
      </Box>
    );
  }

  // GIF and still image share a renderer (same trade as web: no optimizer hop
  // for an already third-party-hosted asset).
  return (
    <Box
      className={
        isDetail
          ? "aspect-video w-full overflow-hidden border border-border bg-surface-subtle"
          : "aspect-[4/3] w-full overflow-hidden border-b border-border bg-surface-subtle"
      }
    >
      <Image
        source={{ uri: exercise.mediaUrl! }}
        accessibilityLabel={t("exercise.library.media_label", {
          name: exercise.name,
        })}
        resizeMode="cover"
        onError={() => setHasError(true)}
        style={{ width: "100%", height: "100%" }}
      />
    </Box>
  );
});
