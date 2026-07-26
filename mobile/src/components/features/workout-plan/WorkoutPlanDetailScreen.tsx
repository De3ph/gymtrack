import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { workoutPlanApi } from "@/api/workoutPlanApi";

interface PlanDetail {
  planId?: number;
  name?: string;
  description?: string;
  exercises?: { name?: string; sets?: number; reps?: number; weight?: number }[];
}

export function WorkoutPlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["workoutPlan", id],
    queryFn: () => workoutPlanApi.getById(id!),
    enabled: !!id,
  });

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  if (isError || !data) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>Failed to load plan</Text>
      <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
    </View>
  );

  const plan = data as PlanDetail;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <Text style={styles.title}>{plan.name}</Text>
      {plan.description ? <Text style={styles.desc}>{plan.description}</Text> : null}
      <Text style={styles.sectionTitle}>Exercises ({plan.exercises?.length ?? 0})</Text>
      {(plan.exercises ?? []).map((ex, i) => (
        <View key={i} style={styles.exerciseCard}>
          <Text style={styles.exName}>{ex.name || `Exercise ${i + 1}`}</Text>
          <Text style={styles.exDetail}>{ex.sets} sets × {ex.reps} reps {ex.weight ? `@ ${ex.weight}kg` : ""}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 24, paddingBottom: 48 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 8 },
  desc: { fontSize: 14, color: "#6b7280", marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, marginTop: 8 },
  exerciseCard: { backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 0.5, borderColor: "#e5e7eb" },
  exName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  exDetail: { fontSize: 13, color: "#6b7280", marginTop: 3 },
  errorText: { fontSize: 15, color: "#ef4444", marginBottom: 12 },
  retryButton: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#2563eb", borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "600" },
});
