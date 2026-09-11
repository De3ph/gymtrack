import React, { useState, useCallback } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  ListRenderItemInfo,
  Alert
} from "react-native"
import { useRouter, type Href } from "expo-router"
import { useI18n } from "@/lib/i18n"
import { mealApi } from "@/api/mealApi"
import { todayString } from "@/lib/dates"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Meal, MealListResponse } from "@/types"
import { canEdit } from "@/lib/canEdit"
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Button, Host, Picker, RNHostView } from "@expo/ui";
import { Input, InputField } from "@/components/ui/input";
import { DateField } from "@/components/features/common/DateField";
import { Badge, BadgeText } from "@/components/ui/badge";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalCloseButton
} from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { Icon, CloseIcon, TrashIcon } from "@/components/ui/icon";
import { Center } from "@/components/ui/center";
import { MealIcon, PlusIcon } from "@/components/icons";
import { useAppColors } from "@/lib/colors";
import { isSessionExpiredError } from "@/api/client";
import { SessionExpiredView } from "@/components/features/auth/SessionExpiredView";

const MEAL_TYPES: ("breakfast" | "lunch" | "dinner" | "snack")[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack"
]

interface NewFoodItem {
  id: string
  food: string
  quantity: string
  calories: string
  protein: string
  carbs: string
  fats: string
}

let itemCounter = 0
function nextItemId(): string {
  itemCounter += 1
  return "fi-" + String(itemCounter)
}

function createEmptyItem(): NewFoodItem {
  return {
    id: nextItemId(),
    food: "",
    quantity: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: ""
  }
}

/** Convert a Meal's items to the editable NewFoodItem[] shape */
function mealToItems(meal: Meal): NewFoodItem[] {
  return (meal.items ?? []).map((item) => ({
    id: nextItemId(),
    food: item.food ?? "",
    quantity: item.quantity ?? "",
    calories: String(item.calories ?? ""),
    protein: String(item.macros?.protein ?? ""),
    carbs: String(item.macros?.carbs ?? ""),
    fats: String(item.macros?.fats ?? "")
  }))
}

// Meal card for the list

interface MealCardProps {
  meal: Meal
  editable: boolean
  onOpen: (meal: Meal) => void
  onEdit: (meal: Meal) => void
  onDelete: (meal: Meal) => void
}

function MealCard({ meal, editable, onOpen, onEdit, onDelete }: MealCardProps) {
  const { t } = useI18n()
  const itemCount = meal.items?.length ?? 0
  const totalCalories =
    meal.items?.reduce((sum, item) => sum + (item.calories ?? 0), 0) ?? 0

  const mealTypeLabel =
    String(meal.mealType).charAt(0).toUpperCase() +
    String(meal.mealType).slice(1)

  const formattedDate = new Date(meal.date).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric"
  })

  return (
    <Pressable
      onPress={() => onOpen(meal)}
      className="mb-2 rounded-xl bg-card p-4"
    >
      <HStack className="mb-2 items-center justify-between">
        <Text className="text-[15px] font-semibold text-text">{formattedDate}</Text>
        <Badge className="rounded-md bg-primary/10 px-2.5 py-1">
          <BadgeText className="text-xs font-semibold capitalize text-primary">
            {mealTypeLabel}
          </BadgeText>
        </Badge>
      </HStack>
      <HStack className="items-center">
        <Text className="text-[13px] text-text-secondary">
          {String(itemCount) + " " + t("meal.card.items")}
        </Text>
        <Text className="mx-2 text-[13px] text-text-tertiary">|</Text>
        <Text className="text-[13px] text-text-secondary">
          {String(totalCalories) + " " + t("meal.card.kcal")}
        </Text>
      </HStack>
      {editable && (
        <HStack className="mt-2.5 justify-end gap-4 border-t border-border pt-2">
          <Pressable onPress={() => onEdit(meal)} className="px-2 py-1">
            <Text className="text-sm font-semibold text-primary">
              {t("common.actions.edit")}
            </Text>
          </Pressable>
          <Pressable onPress={() => onDelete(meal)} className="px-2 py-1">
            <Text className="text-sm font-semibold text-danger">
              {t("common.actions.delete")}
            </Text>
          </Pressable>
        </HStack>
      )}
    </Pressable>
  )
}

export function MealsScreen() {
  const { t } = useI18n()
  const colors = useAppColors()
  const queryClient = useQueryClient()
  const router = useRouter()

  const openDetail = useCallback((m: Meal) => {
    if (m.mealId == null) return
    router.push(("/meals/" + String(m.mealId)) as Href)
  }, [router])

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useQuery<MealListResponse>({
      queryKey: ["meals", "list"],
      queryFn: () => mealApi.getAll() as Promise<MealListResponse>
    })

  const meals: Meal[] = data?.meals ?? []

  const [modalVisible, setModalVisible] = useState(false)
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null)
  const [newDate, setNewDate] = useState(todayString)
  const [newMealType, setNewMealType] = useState<
    "breakfast" | "lunch" | "dinner" | "snack"
  >("breakfast")
  const [newItems, setNewItems] = useState<NewFoodItem[]>([createEmptyItem()])
  const [submitError, setSubmitError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => mealApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meals", "list"] })
      setModalVisible(false)
      resetForm()
    },
    onError: (err: Error) => {
      setSubmitError(err.message || t("common.errors.generic"))
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      mealApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meals", "list"] })
      setModalVisible(false)
      resetForm()
    },
    onError: (err: Error) => {
      setSubmitError(err.message || t("common.errors.generic"))
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => mealApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meals", "list"] })
    },
    onError: (err: Error) => {
      Alert.alert(t("common.errors.generic"), err.message)
    }
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  function resetForm() {
    setEditingMeal(null)
    setNewDate(todayString)
    setNewMealType("breakfast")
    setNewItems([createEmptyItem()])
    setSubmitError(null)
  }

  function openCreateModal() {
    resetForm()
    setModalVisible(true)
  }

  function openEditModal(meal: Meal) {
    setEditingMeal(meal)
    setNewDate(meal.date)
    setNewMealType(meal.mealType as "breakfast" | "lunch" | "dinner" | "snack")
    setNewItems(mealToItems(meal))
    setSubmitError(null)
    setModalVisible(true)
  }

  const handleDelete = useCallback(
    (meal: Meal) => {
      const id = meal.mealId
      if (id == null) return
      Alert.alert(t("meal.list.delete"), t("meal.card.confirm_delete"), [
        { text: t("common.actions.cancel"), style: "cancel" },
        {
          text: t("common.actions.delete"),
          style: "destructive",
          onPress: () => deleteMutation.mutate(id)
        }
      ])
    },
    [t, deleteMutation]
  )

  function handleCancel() {
    setModalVisible(false)
    resetForm()
  }

  function handleAddItem() {
    setNewItems((prev) => [...prev, createEmptyItem()])
  }

  function handleRemoveItem(id: string) {
    setNewItems((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((item) => item.id !== id)
    })
  }

  function updateItemField(
    id: string,
    field: keyof NewFoodItem,
    value: string
  ) {
    setNewItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  function handleSubmit() {
    setSubmitError(null)

    if (!newDate.trim()) {
      setSubmitError(t("meal.form.validation.date_required"))
      return
    }

    const filledItems = newItems.filter(
      (item) => item.food.trim() && item.quantity.trim()
    )
    if (filledItems.length === 0) {
      setSubmitError(t("meal.form.validation.items_min_one"))
      return
    }

    const payloadItems = filledItems
      .map((item) => {
        const calories = parseFloat(item.calories) || 0
        const protein = parseFloat(item.protein) || 0
        const carbs = parseFloat(item.carbs) || 0
        const fats = parseFloat(item.fats) || 0

        const foodItem: Record<string, unknown> = {
          food: item.food.trim(),
          quantity: item.quantity.trim(),
          calories
        }

        if (protein > 0 || carbs > 0 || fats > 0) {
          (foodItem as Record<string, unknown>).macros = { protein, carbs, fats }
        }

        return foodItem
      })

    const payload: Record<string, unknown> = {
      date: newDate.trim(),
      mealType: newMealType,
      items: payloadItems
    }

    if (editingMeal?.mealId != null) {
      updateMutation.mutate({ id: editingMeal.mealId, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const renderMealItem = useCallback(
    ({ item }: ListRenderItemInfo<Meal>) => (
      <MealCard
        meal={item}
        editable={canEdit(item.createdAt)}
        onOpen={openDetail}
        onEdit={openEditModal}
        onDelete={handleDelete}
      />
    ),
    [openDetail, handleDelete]
  )

  const mealKeyExtractor = useCallback(
    (item: Meal) => String(item.mealId ?? item.date + "-" + item.mealType),
    []
  )

  if (isLoading) {
    return (
      <Center className="flex-1 bg-background p-6">
        <Spinner size="large" />
        <Text className="mt-3 text-[15px] text-text-secondary">{t("common.loading")}</Text>
      </Center>
    )
  }

  if (isError && meals.length === 0) {
    const errorMessage = (error as Error)?.message || t("common.errors.generic")
    if (isSessionExpiredError(error)) {
      return <SessionExpiredView message={errorMessage} />
    }
    return (
      <Center className="flex-1 bg-background p-6">
        <Text className="mb-2 text-4xl font-bold text-danger">!</Text>
        <Text className="mb-4 text-center text-[15px] text-danger">{errorMessage}</Text>
        <Host matchContents>
          <Button label={t("common.actions.retry")} onPress={() => refetch()} />
        </Host>
      </Center>
    )
  }

  const renderEmpty = () => (
    <Box className="items-center py-16">
      <MealIcon
        size={48}
        color={colors.textTertiary}
        style={{ marginBottom: 16 }}
      />
      <Text className="text-center text-base text-text-secondary">{t("meal.list.no_meals")}</Text>
    </Box>
  )

  const modalTitle = editingMeal
    ? t("meal.edit_dialog.title")
    : t("meal.form.title")
  const submitLabel = editingMeal
    ? t("meal.edit_dialog.save_changes")
    : t("meal.form.submit")

  return (
    <Box className="flex-1 bg-background">
      <FlatList
        data={meals}
        keyExtractor={mealKeyExtractor}
        renderItem={renderMealItem}
        contentContainerStyle={
          meals.length === 0 ? { flexGrow: 1, justifyContent: "center", padding: 24 } : { padding: 16, paddingBottom: 100 }
        }
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
          />
        }
      />

      {/* FAB */}
      {!modalVisible && (
        <Host
          matchContents
          style={{ position: "absolute", bottom: 24, right: 24 }}
        >
          <Button
            onPress={openCreateModal}
            style={{ width: 56, height: 56, borderRadius: 28 }}
          >
          <RNHostView
            style={{
              width: 32,
              height: 32,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PlusIcon
              size={32}
              color="#ffffff"
              style={{ width: 32, lineHeight: 32, textAlign: "center" }}
            />
          </RNHostView>
          </Button>
        </Host>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={modalVisible} onClose={handleCancel} size="full">
        <ModalBackdrop />
        <ModalContent className="max-h-[92%] p-0">
          <ScrollView
            contentContainerClassName="p-5 pt-2 pb-8"
            keyboardShouldPersistTaps="handled"
          >
            <ModalHeader className="flex-row items-center justify-between pb-2">
              <Text className="text-[22px] font-bold text-text">{modalTitle}</Text>
              <ModalCloseButton>
                <Icon as={CloseIcon} className="text-text-secondary" />
              </ModalCloseButton>
            </ModalHeader>
            {/* Date */}
              <Text className="mb-1.5 mt-3 text-sm font-semibold text-text">
                {t("meal.form.date.label")}
              </Text>
              <DateField
                value={newDate}
                onChange={setNewDate}
                disabled={!!editingMeal}
              />

              {/* Meal Type */}
              <Text className="mb-1.5 mt-3 text-sm font-semibold text-text">
                {t("meal.form.meal_type.label")}
              </Text>
              <Host matchContents>
                <Picker
                  selectedValue={newMealType}
                  onValueChange={(value) =>
                    setNewMealType(
                      value as "breakfast" | "lunch" | "dinner" | "snack"
                    )
                  }
                >
                  {MEAL_TYPES.map((type) => (
                    <Picker.Item
                      key={type}
                      label={t("meal.form.meal_type." + type)}
                      value={type}
                    />
                  ))}
                </Picker>
              </Host>

              {/* Food Items */}
              <Text className="mb-1.5 mt-3 text-sm font-semibold text-text">
                {t("meal.form.food.label")}
              </Text>
              {newItems.map((item, idx) => (
                <Box
                  key={item.id}
                  className="mt-3 rounded-[10px] border border-border-strong bg-card p-3.5"
                >
                  <HStack className="mb-1.5 items-center justify-between">
                    <Text className="text-sm font-semibold text-text-body">
                      {"Item " + String(idx + 1)}
                    </Text>
                    {newItems.length > 1 && (
                      <Pressable
                        onPress={() => handleRemoveItem(item.id)}
                        className="flex-row items-center gap-1 px-1 py-1"
                      >
                        <Icon as={TrashIcon} className="text-danger" size="sm" />
                        <Text className="text-sm font-medium text-danger">
                          {t("common.actions.remove")}
                        </Text>
                      </Pressable>
                    )}
                  </HStack>

                  <Input className="mb-2">
                    <InputField
                      placeholder={t("meal.form.food.placeholder")}
                      value={item.food}
                      onChangeText={(v) => updateItemField(item.id, "food", v)}
                    />
                  </Input>

                  <HStack space="sm" className="mb-2">
                    <Box className="flex-1">
                      <Input>
                        <InputField
                          placeholder={t("meal.form.quantity.placeholder")}
                          value={item.quantity}
                          onChangeText={(v) =>
                            updateItemField(item.id, "quantity", v)
                          }
                        />
                      </Input>
                    </Box>
                    <Box className="flex-1">
                      <Input>
                        <InputField
                          placeholder={t("meal.form.calories.placeholder")}
                          value={item.calories}
                          onChangeText={(v) =>
                            updateItemField(item.id, "calories", v)
                          }
                          keyboardType="numeric"
                        />
                      </Input>
                    </Box>
                  </HStack>

                  {/* Macros */}
                  <Text className="mb-1 mt-1.5 text-[13px] font-semibold text-text-body">
                    {t("meal.form.macros.label")}
                  </Text>
                  <HStack space="sm">
                    <Box className="flex-1">
                      <Input>
                        <InputField
                          placeholder={t("meal.form.macros.protein")}
                          value={item.protein}
                          onChangeText={(v) =>
                            updateItemField(item.id, "protein", v)
                          }
                          keyboardType="numeric"
                        />
                      </Input>
                    </Box>
                    <Box className="flex-1">
                      <Input>
                        <InputField
                          placeholder={t("meal.form.macros.carbs")}
                          value={item.carbs}
                          onChangeText={(v) => updateItemField(item.id, "carbs", v)}
                          keyboardType="numeric"
                        />
                      </Input>
                    </Box>
                    <Box className="flex-1">
                      <Input>
                        <InputField
                          placeholder={t("meal.form.macros.fats")}
                          value={item.fats}
                          onChangeText={(v) => updateItemField(item.id, "fats", v)}
                          keyboardType="numeric"
                        />
                      </Input>
                    </Box>
                  </HStack>
                </Box>
              ))}

              {/* Add Item */}
              <Host matchContents>
                <Button
                  label={"+ " + t("meal.form.add_item")}
                  variant="outlined"
                  onPress={handleAddItem}
                />
              </Host>

              {/* Submit error */}
              {submitError ? (
                <Box className="mb-4 mt-4 rounded border-l-4 border-l-danger bg-danger-surface p-3">
                  <Text className="text-sm font-medium text-danger-text">{submitError}</Text>
                </Box>
              ) : null}
            <ModalFooter className="mt-4 justify-end gap-3 border-t border-border pt-4">
              <Host matchContents>
                <Button
                  label={t("common.actions.cancel")}
                  variant="outlined"
                  onPress={handleCancel}
                />
              </Host>
              <Host matchContents>
                <Button
                  label={submitLabel}
                  onPress={handleSubmit}
                  disabled={isPending}
                />
              </Host>
            </ModalFooter>
          </ScrollView>
        </ModalContent>
      </Modal>
    </Box>
  )
}
