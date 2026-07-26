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

interface Plan {
  planId?: number;
  name?: string;
  description?: string;
  exercises?: unknown[];
}

export function MyWorkoutPlansScreen() {
  const router = useRouter();
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
        <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
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

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: "#e5e7eb" },
  planName: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 4 },
  planDesc: { fontSize: 13, color: "#6b7280", marginBottom: 6 },
  exerciseCount: { fontSize: 12, fontWeight: "600", color: "#2563eb" },
  emptyText: { fontSize: 15, color: "#6b7280" },
  errorText: { fontSize: 15, color: "#ef4444", marginBottom: 12 },
  retryButton: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#2563eb", borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "600" },
});
