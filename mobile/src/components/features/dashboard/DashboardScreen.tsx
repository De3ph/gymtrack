import { useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/stores/authStore";
import { workoutApi } from "@/api/workoutApi";
import { mealApi } from "@/api/mealApi";
import type { Workout, Meal, WorkoutListResponse, MealListResponse } from "@/types";

const QUICK_ACTIONS = [
  { key: "workouts", icon: "🏋️", route: "/(tabs)/workouts" as const },
  { key: "meals", icon: "🍽️", route: "/(tabs)/meals" as const },
  { key: "measurements", icon: "📏", route: "/(tabs)/measurements" as const },
  { key: "trainers", icon: "👤", route: "/trainer-catalog" as const },
] as const;

export function DashboardScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const displayName = user?.profile?.name || user?.username || (user?.email?.split("@")[0]) || "";

  const workoutsQuery = useQuery<WorkoutListResponse>({
    queryKey: ["workouts", "recent"],
    queryFn: () => workoutApi.getAll({ limit: "5" }) as Promise<WorkoutListResponse>,
  });

  const mealsQuery = useQuery<MealListResponse>({
    queryKey: ["meals", "recent"],
    queryFn: () => mealApi.getAll({ limit: "5" }) as Promise<MealListResponse>,
  });

  const isRefreshing = workoutsQuery.isRefetching || mealsQuery.isRefetching;
  const isLoading = workoutsQuery.isLoading || mealsQuery.isLoading;

  const onRefresh = useCallback(() => {
    workoutsQuery.refetch();
    mealsQuery.refetch();
  }, [workoutsQuery, mealsQuery]);

  const recentActivity = useMemo(() => {
    const items: Array<{ type: "workout" | "meal"; data: Workout | Meal; date: string }> = [];
    (workoutsQuery.data?.workouts ?? []).forEach((w) => items.push({ type: "workout" as const, data: w, date: w.date }));
    (mealsQuery.data?.meals ?? []).forEach((m) => items.push({ type: "meal" as const, data: m, date: m.date }));
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items.slice(0, 10);
  }, [workoutsQuery.data, mealsQuery.data]);

  const errorMessage = (workoutsQuery.error as Error)?.message || (mealsQuery.error as Error)?.message || "";

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  const hasError = workoutsQuery.isError || mealsQuery.isError;
  if (hasError && !recentActivity.length) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{errorMessage || t("common.errors.generic")}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
          <Text style={styles.retryButtonText}>{t("common.actions.retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString(undefined, { weekday: "short" as const, month: "short" as const, day: "numeric" as const });

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>{t("dashboard.welcome").replace("{name}", displayName)}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity key={action.key} style={styles.quickActionCard} onPress={() => router.push(action.route)} activeOpacity={0.7}>
              <Text style={styles.quickActionIcon}>{action.icon}</Text>
              <Text style={styles.quickActionLabel}>{t("common.navigation." + action.key)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("dashboard.recent.activities")}</Text>
        {recentActivity.length === 0 ? (
          <View style={styles.emptyCard}><Text style={styles.emptyText}>{t("dashboard.no_data.description")}</Text></View>
        ) : (
          recentActivity.map((item, idx) => {
            const workout = item.type === "workout" ? (item.data as Workout) : null;
            const meal = item.type === "meal" ? (item.data as Meal) : null;
            const totalSets = workout?.exercises?.reduce((acc, ex) => acc + (ex.sets?.length ?? 0), 0) ?? 0;
            const totalCal = meal?.items?.reduce((sum, fi) => sum + (fi.calories ?? 0), 0) ?? 0;
            return (
              <TouchableOpacity key={item.type + "-" + idx} style={styles.activityCard} activeOpacity={0.7}
                onPress={() => router.push(item.type === "workout" ? "/(tabs)/workouts" : "/(tabs)/meals")}>
                <View style={styles.activityHeader}>
                  <Text style={styles.activityIcon}>{item.type === "workout" ? "🏋️" : "🍽️"}</Text>
                  <View style={styles.activityMeta}>
                    <Text style={styles.activityType}>{item.type === "workout" ? t("common.navigation.workouts") : t("common.navigation.meals")}</Text>
                    <Text style={styles.activityDate}>{formatDate(item.date)}</Text>
                  </View>
                </View>
                <View style={styles.activityDetail}>
                  <Text style={styles.activityStats}>
                    {workout ? (workout.exercises?.length ?? 0) + " exercises " + String.fromCharCode(183) + " " + totalSets + " sets" : (meal?.items?.length ?? 0) + " items " + String.fromCharCode(183) + " " + totalCal + " kcal"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: "#f9fafb" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#f9fafb" },
  loadingText: { marginTop: 12, fontSize: 15, color: "#6b7280" },
  errorText: { fontSize: 15, color: "#ef4444", textAlign: "center", marginBottom: 16 },
  retryButton: { backgroundColor: "#2563eb", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  welcomeSection: { marginBottom: 20 },
  welcomeTitle: { fontSize: 26, fontWeight: "700", color: "#111827" },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#111827", marginBottom: 12 },
  quickActionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickActionCard: { backgroundColor: "#fff", borderRadius: 12, paddingVertical: 18, paddingHorizontal: 16, alignItems: "center", minWidth: "47%", flex: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  quickActionIcon: { fontSize: 28, marginBottom: 8 },
  quickActionLabel: { fontSize: 14, fontWeight: "600", color: "#111827" },
  activityCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  activityHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  activityIcon: { fontSize: 20, marginRight: 10 },
  activityMeta: { flex: 1 },
  activityType: { fontSize: 15, fontWeight: "600", color: "#111827" },
  activityDate: { fontSize: 12, color: "#6b7280", marginTop: 1 },
  activityDetail: { marginLeft: 30 },
  activityStats: { fontSize: 13, color: "#4b5563" },
  emptyCard: { backgroundColor: "#fff", borderRadius: 12, padding: 32, alignItems: "center" },
  emptyText: { fontSize: 14, color: "#6b7280", textAlign: "center" },
});
