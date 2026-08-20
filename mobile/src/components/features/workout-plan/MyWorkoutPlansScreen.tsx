import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { workoutPlanApi } from "@/api/workoutPlanApi";
import { useThemeColors } from "@/components/useThemeColors";
import type { ThemeColors } from "@/constants/Colors";

interface Plan {
  planId?: number;
  name?: string;
  description?: string;
  exercises?: unknown[];
}

export function MyWorkoutPlansScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const styles = createStyles(c);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["myPlans"],
    queryFn: () => workoutPlanApi.getMyPlans(),
  });

  const plans: Plan[] = (data as { plans?: Plan[] })?.plans ?? [];

  const renderItem = ({ item }: { item: Plan }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/trainer/plans/${item.planId}`)}
      activeOpacity={0.7}
    >
      <Text style={styles.planName}>{item.name}</Text>
      {item.description ? <Text style={styles.planDesc} numberOfLines={2}>{item.description}</Text> : null}
      <Text style={styles.exerciseCount}>{item.exercises?.length ?? 0} exercises</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.flex}>
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={c.accent} /></View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load plans</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(item) => String(item.planId ?? "")}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>No assigned plans</Text></View>}
        />
      )}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
    list: { padding: 16, gap: 12 },
    card: { backgroundColor: c.card, borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: c.border },
    planName: { fontSize: 16, fontWeight: "700", color: c.text, marginBottom: 4 },
    planDesc: { fontSize: 13, color: c.textSecondary, marginBottom: 6 },
    exerciseCount: { fontSize: 12, fontWeight: "600", color: c.accent },
    emptyText: { fontSize: 15, color: c.textSecondary },
    errorText: { fontSize: 15, color: c.danger, marginBottom: 12 },
    retryButton: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: c.accent, borderRadius: 8 },
    retryText: { color: c.onAccent, fontWeight: "600" },
  });
}
