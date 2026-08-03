import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { trainerClientApi } from "@/api/trainerClientApi";

type Tab = "overview" | "workouts" | "meals" | "measurements";

export function ClientDetailScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const [tab, setTab] = useState<Tab>("overview");

  const { data: stats, isLoading: loadingStats, isError: statsError, refetch: refetchStats } = useQuery({
    queryKey: ["clientStats", username],
    queryFn: () => trainerClientApi.getClientStats(username!),
    enabled: !!username && tab === "overview",
  });

  const { data: workouts, isLoading: loadingWorkouts, isError: workoutsError, refetch: refetchWorkouts } = useQuery({
    queryKey: ["clientWorkouts", username],
    queryFn: () => trainerClientApi.getClientWorkouts(username!),
    enabled: !!username && tab === "workouts",
  });

  const { data: meals, isLoading: loadingMeals, isError: mealsError, refetch: refetchMeals } = useQuery({
    queryKey: ["clientMeals", username],
    queryFn: () => trainerClientApi.getClientMeals(username!),
    enabled: !!username && tab === "meals",
  });

  const { data: measurements, isLoading: loadingMeasurements, isError: measurementsError, refetch: refetchMeasurements } = useQuery({
    queryKey: ["clientMeasurements", username],
    queryFn: () => trainerClientApi.getClientMeasurements(username!),
    enabled: !!username && tab === "measurements",
  });

  const tabs: Tab[] = ["overview", "workouts", "meals", "measurements"];
  const isLoading = tab === "overview" ? loadingStats : tab === "workouts" ? loadingWorkouts : tab === "meals" ? loadingMeals : loadingMeasurements;
  const isError = tab === "overview" ? statsError : tab === "workouts" ? workoutsError : tab === "meals" ? mealsError : measurementsError;
  const st = stats as { totalWorkouts?: number; totalMeals?: number; consistency?: number; totalVolume?: number };

  const refetchFailed = () => {
    if (statsError) refetchStats();
    if (workoutsError) refetchWorkouts();
    if (mealsError) refetchMeals();
    if (measurementsError) refetchMeasurements();
  };

  return (
    <View style={styles.flex}>
      <View style={styles.tabBar}>
        {tabs.map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load</Text>
          <TouchableOpacity onPress={refetchFailed} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {tab === "overview" && st && (
            <View style={styles.statsGrid}>
              <View style={styles.statCard}><Text style={styles.statValue}>{st.totalWorkouts ?? 0}</Text><Text style={styles.statLabel}>Workouts</Text></View>
              <View style={styles.statCard}><Text style={styles.statValue}>{st.totalMeals ?? 0}</Text><Text style={styles.statLabel}>Meals</Text></View>
              <View style={styles.statCard}><Text style={styles.statValue}>{st.consistency ?? 0}%</Text><Text style={styles.statLabel}>Consistency</Text></View>
              <View style={styles.statCard}><Text style={styles.statValue}>{st.totalVolume ?? 0}</Text><Text style={styles.statLabel}>Volume</Text></View>
            </View>
          )}
          {tab === "workouts" && (
            <FlatList
              data={(workouts as { workouts?: { workoutId?: number; date?: string; exercises?: unknown[] }[] })?.workouts ?? []}
              keyExtractor={(item) => String(item.workoutId ?? "")}
              renderItem={({ item }) => (
                <View style={styles.listCard}><Text style={styles.listTitle}>{item.date}</Text><Text style={styles.listSub}>{item.exercises?.length ?? 0} exercises</Text></View>
              )}
              scrollEnabled={false}
              ListEmptyComponent={<Text style={styles.emptyText}>No workouts</Text>}
            />
          )}
          {tab === "meals" && (
            <FlatList
              data={(meals as { meals?: { mealId?: number; date?: string; mealType?: string; items?: unknown[] }[] })?.meals ?? []}
              keyExtractor={(item) => String(item.mealId ?? "")}
              renderItem={({ item }) => (
                <View style={styles.listCard}><Text style={styles.listTitle}>{item.mealType} - {item.date}</Text><Text style={styles.listSub}>{item.items?.length ?? 0} items</Text></View>
              )}
              scrollEnabled={false}
              ListEmptyComponent={<Text style={styles.emptyText}>No meals</Text>}
            />
          )}
          {tab === "measurements" && (
            <FlatList
              data={(measurements as { measurements?: { measurementId?: number; date?: string; weight?: number }[] })?.measurements ?? []}
              keyExtractor={(item) => String(item.measurementId ?? "")}
              renderItem={({ item }) => (
                <View style={styles.listCard}><Text style={styles.listTitle}>{item.date}</Text><Text style={styles.listSub}>{item.weight ? `${item.weight} kg` : "N/A"}</Text></View>
              )}
              scrollEnabled={false}
              ListEmptyComponent={<Text style={styles.emptyText}>No measurements</Text>}
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  tabBar: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#2563eb" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#6b7280", textTransform: "capitalize" },
  tabTextActive: { color: "#2563eb" },
  content: { padding: 16 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { flex: 1, minWidth: "45%", backgroundColor: "#fff", borderRadius: 12, padding: 16, alignItems: "center", borderWidth: 0.5, borderColor: "#e5e7eb" },
  statValue: { fontSize: 24, fontWeight: "800", color: "#2563eb" },
  statLabel: { fontSize: 12, fontWeight: "600", color: "#6b7280", marginTop: 4 },
  listCard: { backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 0.5, borderColor: "#e5e7eb" },
  listTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  listSub: { fontSize: 13, color: "#6b7280", marginTop: 3 },
  emptyText: { textAlign: "center", color: "#6b7280", fontSize: 14, marginTop: 40 },
  errorText: { fontSize: 15, color: "#ef4444", marginBottom: 12 },
  retryButton: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#2563eb", borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "600" },
});
