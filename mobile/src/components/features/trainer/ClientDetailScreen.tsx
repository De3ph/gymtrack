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
import { useThemeColors } from "@/components/useThemeColors";
import type { ThemeColors } from "@/constants/Colors";

type Tab = "overview" | "workouts" | "meals" | "measurements";

export function ClientDetailScreen() {
  const c = useThemeColors();
  const { username } = useLocalSearchParams<{ username: string }>();
  const [tab, setTab] = useState<Tab>("overview");

  const styles = createStyles(c);

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
        <View style={styles.center}><ActivityIndicator size="large" color={c.accent} /></View>
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

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    tabBar: { flexDirection: "row", backgroundColor: c.card, borderBottomWidth: 0.5, borderBottomColor: c.border },
    tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
    tabActive: { borderBottomWidth: 2, borderBottomColor: c.accent },
    tabText: { fontSize: 13, fontWeight: "600", color: c.textSecondary, textTransform: "capitalize" },
    tabTextActive: { color: c.accent },
    content: { padding: 16 },
    statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    statCard: { flex: 1, minWidth: "45%", backgroundColor: c.card, borderRadius: 12, padding: 16, alignItems: "center", borderWidth: 0.5, borderColor: c.border },
    statValue: { fontSize: 24, fontWeight: "800", color: c.accent },
    statLabel: { fontSize: 12, fontWeight: "600", color: c.textSecondary, marginTop: 4 },
    listCard: { backgroundColor: c.card, borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 0.5, borderColor: c.border },
    listTitle: { fontSize: 15, fontWeight: "600", color: c.text },
    listSub: { fontSize: 13, color: c.textSecondary, marginTop: 3 },
    emptyText: { textAlign: "center", color: c.textSecondary, fontSize: 14, marginTop: 40 },
    errorText: { fontSize: 15, color: c.danger, marginBottom: 12 },
    retryButton: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: c.accent, borderRadius: 8 },
    retryText: { color: c.onAccent, fontWeight: "600" },
  });
}
