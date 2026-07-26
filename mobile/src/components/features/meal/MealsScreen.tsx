import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ListRenderItemInfo,
} from "react-native";
import { useI18n } from "@/lib/i18n";
import { mealApi } from "@/api/mealApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Meal, MealItem, MealListResponse } from "@/types";

// ------- helpers -------

function todayString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return yyyy + "-" + mm + "-" + dd;
}

const MEAL_TYPES: Array<"breakfast" | "lunch" | "dinner" | "snack"> = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
];

// ------- types for local form state -------

interface NewFoodItem {
  id: string;
  food: string;
  quantity: string;
  calories: string;
  protein: string;
  carbs: string;
  fats: string;
}

let itemCounter = 0;
function nextItemId(): string {
  itemCounter += 1;
  return "fi-" + String(itemCounter);
}

function createEmptyItem(): NewFoodItem {
  return {
    id: nextItemId(),
    food: "",
    quantity: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
  };
}
// ------- meal card for flatlist -------

interface MealCardProps {
  meal: Meal;
}

function MealCard({ meal }: MealCardProps) {
  const { t } = useI18n();
  const itemCount = meal.items?.length ?? 0;
  const totalCalories =
    meal.items?.reduce((sum, item) => sum + (item.calories ?? 0), 0) ?? 0;

  const mealTypeLabel =
    String(meal.mealType).charAt(0).toUpperCase() + String(meal.mealType).slice(1);

  const formattedDate = new Date(meal.date).toLocaleDateString(undefined, {
    weekday: "short" as const,
    year: "numeric" as const,
    month: "short" as const,
    day: "numeric" as const,
  });

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardDate}>{formattedDate}</Text>
        <View style={styles.mealTypeBadge}>
          <Text style={styles.mealTypeBadgeText}>{mealTypeLabel}</Text>
        </View>
      </View>
      <View style={styles.cardStats}>
        <Text style={styles.cardStat}>
          {String(itemCount) + " " + t("meal.card.items")}
        </Text>
        <Text style={styles.cardStatDivider}>|</Text>
        <Text style={styles.cardStat}>
          {String(totalCalories) + " " + t("meal.card.kcal")}
        </Text>
      </View>
    </View>
  );
}

// ------- main screen -------

export function MealsScreen() {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  // --- data ---
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<MealListResponse>({
    queryKey: ["meals", "list"],
    queryFn: () => mealApi.getAll() as Promise<MealListResponse>,
  });

  const meals: Meal[] = data?.meals ?? [];

  // --- form state ---
  const [modalVisible, setModalVisible] = useState(false);
  const [newDate, setNewDate] = useState(todayString);
  const [newMealType, setNewMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">("breakfast");
  const [newItems, setNewItems] = useState<NewFoodItem[]>([createEmptyItem()]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // --- create mutation ---
  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      mealApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meals", "list"] });
      setModalVisible(false);
      resetForm();
    },
    onError: (err: Error) => {
      setSubmitError(err.message || t("common.errors.generic"));
    },
  });

  // --- form helpers ---
  function resetForm() {
    setNewDate(todayString);
    setNewMealType("breakfast");
    setNewItems([createEmptyItem()]);
    setSubmitError(null);
  }

  function handleCancel() {
    setModalVisible(false);
    resetForm();
  }

  function handleAddItem() {
    setNewItems((prev) => [...prev, createEmptyItem()]);
  }

  function handleRemoveItem(id: string) {
    setNewItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item.id !== id);
    });
  }

  function updateItemField(id: string, field: keyof NewFoodItem, value: string) {
    setNewItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }

  function handleSubmit() {
    setSubmitError(null);

    if (!newDate.trim()) {
      setSubmitError(t("meal.form.validation.date_required"));
      return;
    }

    const filledItems = newItems.filter(
      (item) => item.food.trim() && item.quantity.trim()
    );
    if (filledItems.length === 0) {
      setSubmitError(t("meal.form.validation.items_min_one"));
      return;
    }

    const payloadItems = newItems
      .filter((item) => item.food.trim() && item.quantity.trim())
      .map((item) => {
        const calories = parseFloat(item.calories) || 0;
        const protein = parseFloat(item.protein) || 0;
        const carbs = parseFloat(item.carbs) || 0;
        const fats = parseFloat(item.fats) || 0;

        const foodItem: Record<string, unknown> = {
          food: item.food.trim(),
          quantity: item.quantity.trim(),
          calories,
        };

        if (protein > 0 || carbs > 0 || fats > 0) {
          foodItem.macros = { protein, carbs, fats };
        }

        return foodItem;
      });

    const payload: Record<string, unknown> = {
      date: newDate.trim(),
      mealType: newMealType,
      items: payloadItems,
    };

    createMutation.mutate(payload);
  }

  // --- render helpers ---
  const renderMealItem = useCallback(
    ({ item }: ListRenderItemInfo<Meal>) => <MealCard meal={item} />,
    []
  );

  const mealKeyExtractor = useCallback(
    (item: Meal) => String(item.mealId ?? item.date + "-" + item.mealType),
    []
  );

  // --- loading state ---
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  // --- error state ---
  if (isError && meals.length === 0) {
    const errorMessage =
      (error as Error)?.message || t("common.errors.generic");
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>!</Text>
        <Text style={styles.errorText}>{errorMessage}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>{t("common.actions.submit")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- empty state ---
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🍽️</Text>
      <Text style={styles.emptyText}>{t("meal.list.no_meals")}</Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={meals}
        keyExtractor={mealKeyExtractor}
        renderItem={renderMealItem}
        contentContainerStyle={
          meals.length === 0 ? styles.listEmptyContent : styles.listContent
        }
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCancel}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.modalTitle}>{t("meal.form.title")}</Text>

            {/* Date */}
            <Text style={styles.fieldLabel}>{t("meal.form.date.label")}</Text>
            <TextInput
              style={styles.textInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
              value={newDate}
              onChangeText={setNewDate}
              autoCapitalize="none"
            />

            {/* Meal Type */}
            <Text style={styles.fieldLabel}>{t("meal.form.meal_type.label")}</Text>
            <View style={styles.mealTypeRow}>
              {MEAL_TYPES.map((type) => {
                const isSelected = newMealType === type;
                const i18nKey = "meal.form.meal_type." + type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.mealTypeButton,
                      isSelected
                        ? styles.mealTypeButtonSelected
                        : styles.mealTypeButtonUnselected,
                    ]}
                    onPress={() => setNewMealType(type)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.mealTypeButtonText,
                        isSelected
                          ? styles.mealTypeButtonTextSelected
                          : styles.mealTypeButtonTextUnselected,
                      ]}
                    >
                      {t(i18nKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Food Items */}
            <Text style={styles.fieldLabel}>{t("meal.form.food.label")}</Text>
            {newItems.map((item, idx) => (
              <View key={item.id} style={styles.foodItemBlock}>
                <View style={styles.foodItemHeader}>
                  <Text style={styles.foodItemTitle}>
                    {"Item " + String(idx + 1)}
                  </Text>
                  {newItems.length > 1 && (
                    <TouchableOpacity onPress={() => handleRemoveItem(item.id)}>
                      <Text style={styles.removeLink}>{t("common.actions.remove")}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TextInput
                  style={styles.textInput}
                  placeholder={t("meal.form.food.placeholder")}
                  placeholderTextColor="#9ca3af"
                  value={item.food}
                  onChangeText={(v) => updateItemField(item.id, "food", v)}
                />

                <View style={styles.rowFields}>
                  <View style={styles.rowFieldHalf}>
                    <TextInput
                      style={styles.textInput}
                      placeholder={t("meal.form.quantity.placeholder")}
                      placeholderTextColor="#9ca3af"
                      value={item.quantity}
                      onChangeText={(v) => updateItemField(item.id, "quantity", v)}
                    />
                  </View>
                  <View style={styles.rowFieldHalf}>
                    <TextInput
                      style={styles.textInput}
                      placeholder={t("meal.form.calories.placeholder")}
                      placeholderTextColor="#9ca3af"
                      value={item.calories}
                      onChangeText={(v) => updateItemField(item.id, "calories", v)}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Macros */}
                <Text style={styles.macrosLabel}>{t("meal.form.macros.label")}</Text>
                <View style={styles.macrosRow}>
                  <View style={styles.macroField}>
                    <TextInput
                      style={[styles.textInput, styles.macroInput]}
                      placeholder={t("meal.form.macros.protein")}
                      placeholderTextColor="#9ca3af"
                      value={item.protein}
                      onChangeText={(v) => updateItemField(item.id, "protein", v)}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.macroField}>
                    <TextInput
                      style={[styles.textInput, styles.macroInput]}
                      placeholder={t("meal.form.macros.carbs")}
                      placeholderTextColor="#9ca3af"
                      value={item.carbs}
                      onChangeText={(v) => updateItemField(item.id, "carbs", v)}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.macroField}>
                    <TextInput
                      style={[styles.textInput, styles.macroInput]}
                      placeholder={t("meal.form.macros.fats")}
                      placeholderTextColor="#9ca3af"
                      value={item.fats}
                      onChangeText={(v) => updateItemField(item.id, "fats", v)}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>
            ))}

            {/* Add Item */}
            <TouchableOpacity
              style={styles.addItemButton}
              onPress={handleAddItem}
              activeOpacity={0.7}
            >
              <Text style={styles.addItemButtonText}>
                {"+ " + t("meal.form.add_item")}
              </Text>
            </TouchableOpacity>

            {/* Submit error */}
            {submitError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{submitError}</Text>
              </View>
            ) : null}

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>
                  {t("common.actions.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  createMutation.isPending && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {t("meal.form.submit")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ------- styles -------

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },

  // list
  listContent: { padding: 16, paddingBottom: 100 },
  listEmptyContent: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 24 },

  // centered states
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#f9fafb" },
  loadingText: { marginTop: 12, fontSize: 15, color: "#6b7280" },
  errorIcon: { fontSize: 40, color: "#ef4444", marginBottom: 8, fontWeight: "700" },
  errorText: { fontSize: 15, color: "#ef4444", textAlign: "center", marginBottom: 16 },
  retryButton: { backgroundColor: "#2563eb", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },

  // empty
  emptyContainer: { alignItems: "center", paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: "#6b7280", textAlign: "center" },

  // card
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardDate: { fontSize: 15, fontWeight: "600", color: "#111827" },
  mealTypeBadge: {
    backgroundColor: "#eff6ff",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  mealTypeBadgeText: { fontSize: 12, fontWeight: "600", color: "#2563eb", textTransform: "capitalize" },
  cardStats: { flexDirection: "row", alignItems: "center" },
  cardStat: { fontSize: 13, color: "#4b5563" },
  cardStatDivider: { marginHorizontal: 8, color: "#d1d5db", fontSize: 13 },

  // fab
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  fabText: { fontSize: 28, color: "#fff", lineHeight: 30 },

  // modal
  modalOverlay: { flex: 1, backgroundColor: "#f9fafb" },
  modalScroll: { flex: 1 },
  modalContent: { padding: 20, paddingBottom: 60 },
  modalTitle: { fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 20 },

  // fields
  fieldLabel: { fontSize: 14, fontWeight: "600", color: "#111827", marginBottom: 6, marginTop: 12 },
  textInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#fff",
    marginBottom: 8,
  },

  // meal type row
  mealTypeRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  mealTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  mealTypeButtonSelected: { backgroundColor: "#2563eb" },
  mealTypeButtonUnselected: { backgroundColor: "#f3f4f6", borderWidth: 1, borderColor: "#d1d5db" },
  mealTypeButtonText: { fontSize: 12, fontWeight: "600" },
  mealTypeButtonTextSelected: { color: "#fff" },
  mealTypeButtonTextUnselected: { color: "#6b7280" },

  // food item block
  foodItemBlock: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
    backgroundColor: "#fff",
  },
  foodItemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  foodItemTitle: { fontSize: 14, fontWeight: "600", color: "#374151" },
  removeLink: { fontSize: 14, color: "#ef4444", fontWeight: "500" },

  // row fields
  rowFields: { flexDirection: "row", gap: 8 },
  rowFieldHalf: { flex: 1 },

  // macros
  macrosLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginTop: 6, marginBottom: 4 },
  macrosRow: { flexDirection: "row", gap: 8 },
  macroField: { flex: 1 },
  macroInput: { marginBottom: 0 },

  // add item
  addItemButton: {
    borderWidth: 1,
    borderColor: "#2563eb",
    borderStyle: "dashed",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  addItemButtonText: { fontSize: 15, color: "#2563eb", fontWeight: "600" },

  // error banner
  errorBanner: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  errorBannerText: { fontSize: 14, color: "#ef4444" },

  // modal actions
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 24 },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  cancelButtonText: { fontSize: 15, color: "#6b7280", fontWeight: "600" },
  submitButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { fontSize: 15, color: "#fff", fontWeight: "600" },
});
