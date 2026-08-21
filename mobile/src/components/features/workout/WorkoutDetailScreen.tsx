import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { workoutApi } from "@/api/workoutApi";
import { useI18n } from "@/lib/i18n";
import { CommentSection } from "@/components/features/comments/CommentSection";
import { useThemeColors } from "@/components/useThemeColors";
import type { ThemeColors } from "@/constants/Colors";
import type { Workout } from "@/types";

export function WorkoutDetailScreen() {
  const c = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();

  const styles = createStyles(c);

  const { data, isLoading, isError, refetch } = useQuery<Workout>({
    queryKey: ["workout", id],
    queryFn: () => workoutApi.getById(id!) as Promise<Workout>,
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load workout</Text>
        <Pressable onPress={() => refetch()} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const workout = data;
  const formattedDate = new Date(workout.date).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>
            {"\u2039"} {t("common.actions.back")}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.dateText}>{formattedDate}</Text>
      <Text style={styles.sectionTitle}>
        {t("workout.list.exercises")} ({workout.exercises?.length ?? 0})
      </Text>

      {(workout.exercises ?? []).map((ex, i) => (
        <View key={i} style={styles.exerciseCard}>
          <Text style={styles.exName}>{ex.name || `Exercise ${i + 1}`}</Text>
          {ex.notes ? <Text style={styles.exNotes}>{ex.notes}</Text> : null}
          {(ex.sets ?? []).map((s, j) => (
            <View key={j} style={styles.setRow}>
              <Text style={styles.setNumber}>#{j + 1}</Text>
              <Text style={styles.setDetail}>
                {s.weight ?? 0} kg {"\u00D7"} {s.reps ?? 0} reps
              </Text>
            </View>
          ))}
        </View>
      ))}

      <CommentSection targetType="workout" targetId={id!} />
    </ScrollView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    container: { padding: 20, paddingBottom: 48 },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: c.background,
    },
    headerBar: { marginBottom: 8 },
    backButton: { paddingVertical: 6, alignSelf: "flex-start" },
    backText: { fontSize: 16, color: c.accent, fontWeight: "600" },
    dateText: {
      fontSize: 22,
      fontWeight: "700",
      color: c.text,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: c.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 12,
    },
    exerciseCard: {
      backgroundColor: c.card,
      borderRadius: 10,
      padding: 14,
      marginBottom: 8,
      borderWidth: 0.5,
      borderColor: c.border,
    },
    exName: { fontSize: 16, fontWeight: "600", color: c.text },
    exNotes: { fontSize: 13, color: c.textTertiary, marginTop: 4, fontStyle: "italic" },
    setRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 6,
    },
    setNumber: { fontSize: 13, color: c.textTertiary, width: 28 },
    setDetail: { fontSize: 14, color: c.textBody, fontWeight: "500" },
    errorText: { fontSize: 15, color: c.danger, marginBottom: 12 },
    retryButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: c.accent,
      borderRadius: 8,
    },
    retryText: { color: c.onAccent, fontWeight: "600" },
  });
}