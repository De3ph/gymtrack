import { useState } from "react"
import { ScrollView } from "react-native"
import { useI18n } from "@/lib/i18n"
import { mealApi } from "@/api/mealApi"
import { todayString } from "@/lib/dates"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { Meal } from "@/types"
import { Box } from "@/components/ui/box"
import { Text } from "@/components/ui/text"
import { Button, Host, Picker } from "@expo/ui"
import { Input, InputField } from "@/components/ui/input"
import { DateField } from "@/components/features/common/DateField"
import { HStack } from "@/components/ui/hstack"
import { Pressable } from "@/components/ui/pressable"
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalCloseButton
} from "@/components/ui/modal"
import { Icon, CloseIcon, TrashIcon } from "@/components/ui/icon"

const MEAL_TYPES: ("breakfast" | "lunch" | "dinner" | "snack")[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack"
]

export type MealType = (typeof MEAL_TYPES)[number]

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

interface MealFormModalProps {
  visible: boolean
  meal: Meal | null
  onClose: () => void
  onSaved: () => void
  /**
   * Pre-selects a meal type when creating. Ignored when editing an existing
   * meal, which always derives its type from `meal.mealType`.
   */
  initialMealType?: MealType
}

export function MealFormModal({
  visible,
  meal,
  onClose,
  onSaved,
  initialMealType
}: MealFormModalProps) {
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const [newDate, setNewDate] = useState(() => meal?.date ?? todayString())
  const [newMealType, setNewMealType] = useState<MealType>(
    () => (meal?.mealType as MealType) ?? initialMealType ?? "breakfast"
  )
  const [newItems, setNewItems] = useState<NewFoodItem[]>(() =>
    meal ? mealToItems(meal) : [createEmptyItem()]
  )
  const [submitError, setSubmitError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => mealApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meals", "list"] })
      onSaved()
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
      onSaved()
    },
    onError: (err: Error) => {
      setSubmitError(err.message || t("common.errors.generic"))
    }
  })

  const isPending = createMutation.isPending || updateMutation.isPending

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

    const payloadItems = filledItems.map((item) => {
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
        foodItem.macros = { protein, carbs, fats }
      }

      return foodItem
    })

    const payload: Record<string, unknown> = {
      date: newDate.trim(),
      mealType: newMealType,
      items: payloadItems
    }

    if (meal?.mealId != null) {
      updateMutation.mutate({ id: meal.mealId, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const modalTitle = meal
    ? t("meal.edit_dialog.title")
    : t("meal.form.title")
  const submitLabel = meal
    ? t("meal.edit_dialog.save_changes")
    : t("meal.form.submit")

  return (
    <Modal isOpen={visible} onClose={onClose} size="full">
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
            disabled={!!meal}
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
              <Text className="text-sm font-medium text-danger-text">
                {submitError}
              </Text>
            </Box>
          ) : null}

          <ModalFooter className="mt-4 justify-end gap-3 border-t border-border pt-4">
            <Host matchContents>
              <Button
                label={t("common.actions.cancel")}
                variant="outlined"
                onPress={onClose}
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
  )
}
