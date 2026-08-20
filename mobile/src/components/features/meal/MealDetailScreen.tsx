import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { mealApi } from "@/api/mealApi";
import { useI18n } from "@/lib/i18n";
import { CommentSection } from "@/components/features/comments/CommentSection";
import { useThemeColors } from "@/components/useThemeColors";
import type { ThemeColors } from "@/constants/Colors";
import type { Meal } from "@/types";

export function MealDetailScreen() {
  const c = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();

  const styles = createStyles(c);

  const { data, isLoading, isError, refetch } = useQuery<Meal>({
    queryKey: ["meal", id],
    queryFn: () => mealApi.getById(id!) as Promise<Meal>,
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
        <Text style={styles.errorText}>Failed to load meal</Text>
        <TouchableOpacity
          onPress={() => refetch()}
          style={styles.retryButton}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const meal = data;
  const formattedDate = new Date(meal.date).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const mealTypeLabel =
    String(meal.mealType).charAt(0).toUpperCase() + String(meal.mealType).slice(1);
  const totalCalories =
    meal.items?.reduce((sum, item) => sum + (item.calories ?? 0), 0) ?? 0;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>
            {"\u2039"} {t("common.actions.back")}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.dateText}>{formattedDate}</Text>
        <View style={styles.mealTypeBadge}>
          <Text style={styles.mealTypeBadgeText}>{mealTypeLabel}</Text>
        </View>
      </View>
      <Text style={styles.totalCal}>
        {String(totalCalories)} {t("meal.card.kcal")}
      </Text>

      <Text style={styles.sectionTitle}>
        {t("meal.card.items")} ({meal.items?.length ?? 0})
      </Text>

      {(meal.items ?? []).map((item, i) => (
        <View key={i} style={styles.itemCard}>
          <Text style={styles.itemFood}>{item.food}</Text>
          <Text style={styles.itemQty}>{item.quantity}</Text>
          {item.calories ? (
            <Text style={styles.itemCal}>
              {String(item.calories)} {t("meal.card.kcal")}
            </Text>
          ) : null}
          {item.macros ? (
            <Text style={styles.itemMacros}>
              P {String(item.macros.protein ?? 0)} | C{" "}
              {String(item.macros.carbs ?? 0)} | F{" "}
              {String(item.macros.fats ?? 0)}
            </Text>
          ) : null}
        </View>
      ))}

      <CommentSection targetType="meal" targetId={id!} />
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
    titleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },
    dateText: {
      fontSize: 20,
      fontWeight: "700",
      color: c.text,
      flex: 1,
    },
    mealTypeBadge: {
      backgroundColor: c.accentSurface,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    mealTypeBadgeText: { fontSize: 12, fontWeight: "700", color: c.accentOnLight },
    totalCal: { fontSize: 14, color: c.textSecondary, marginBottom: 16 },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: c.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 12,
    },
    itemCard: {
      backgroundColor: c.card,
      borderRadius: 10,
      padding: 14,
      marginBottom: 8,
      borderWidth: 0.5,
      borderColor: c.border,
    },
    itemFood: { fontSize: 15, fontWeight: "600", color: c.text },
    itemQty: { fontSize: 13, color: c.textSecondary, marginTop: 2 },
    itemCal: { fontSize: 13, color: c.textBody, fontWeight: "500", marginTop: 4 },
    itemMacros: { fontSize: 12, color: c.textTertiary, marginTop: 2 },
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
