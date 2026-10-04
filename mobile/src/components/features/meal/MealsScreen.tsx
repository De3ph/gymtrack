import React, { useState, useCallback } from "react";
import {
  FlatList,
  RefreshControl,
  ListRenderItemInfo,
  Alert,
  Platform,
  type AccessibilityActionEvent
} from "react-native"
import { useRouter, type Href } from "expo-router"
import * as Haptics from "expo-haptics"
import Animated, { cubicBezier } from "react-native-reanimated"
import { useI18n } from "@/lib/i18n"
import { mealApi } from "@/api/mealApi"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Meal, MealListResponse } from "@/types"
import { canEdit } from "@/lib/canEdit"
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Button, Host } from "@expo/ui";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import { Icon, AddIcon, ThreeDotsIcon } from "@/components/ui/icon";
import { Center } from "@/components/ui/center";
import { MealIcon } from "@/components/icons";
import { useAppColors } from "@/lib/colors";
import type { ThemeColors } from "@/constants/Colors";
import { isSessionExpiredError } from "@/api/client";
import { SessionExpiredView } from "@/components/features/auth/SessionExpiredView";
import { MealFormModal } from "@/components/features/meal/MealFormModal";

const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1)

const CARD_STYLE = {
  transform: [{ scale: 1 }],
  transitionProperty: "transform" as const,
  transitionDuration: 140,
  transitionTimingFunction: EASE_OUT
}

const CARD_PRESSED_STYLE = {
  transform: [{ scale: 0.97 }]
}

const FAB_STYLE = {
  transform: [{ scale: 1 }],
  transitionProperty: "transform" as const,
  transitionDuration: 120,
  transitionTimingFunction: EASE_OUT
}

const FAB_PRESSED_STYLE = {
  transform: [{ scale: 0.96 }]
}

type MealTypeKey = "breakfast" | "lunch" | "dinner" | "snack"

interface MealTypeMeta {
  surfaceClass: string
  textClass: string
  colorKey: keyof ThemeColors
}

const MEAL_TYPE_META: Record<MealTypeKey, MealTypeMeta> = {
  breakfast: {
    surfaceClass: "bg-warning-surface",
    textClass: "text-warning-text",
    colorKey: "warning"
  },
  lunch: {
    surfaceClass: "bg-brand-surface",
    textClass: "text-brand",
    colorKey: "accent"
  },
  dinner: {
    surfaceClass: "bg-surface-subtle",
    textClass: "text-text-secondary",
    colorKey: "textSecondary"
  },
  snack: {
    surfaceClass: "bg-success-surface",
    textClass: "text-success-text",
    colorKey: "success"
  }
}

const DEFAULT_MEAL_META = MEAL_TYPE_META.dinner

function triggerHaptic() {
  if (Platform.OS === "ios") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }
}

interface MealCardProps {
  meal: Meal
  editable: boolean
  onOpen: (meal: Meal) => void
  onEdit: (meal: Meal) => void
  onDelete: (meal: Meal) => void
}

function MealCard({ meal, editable, onOpen, onEdit, onDelete }: MealCardProps) {
  const { t } = useI18n()
  const colors = useAppColors()
  const [pressed, setPressed] = useState(false)

  const items = meal.items ?? []
  const itemCount = items.length
  const totalCalories = items.reduce(
    (sum, item) => sum + (item.calories ?? 0),
    0
  )
  const macros = items.reduce(
    (acc, item) => ({
      protein: acc.protein + (item.macros?.protein ?? 0),
      carbs: acc.carbs + (item.macros?.carbs ?? 0),
      fats: acc.fats + (item.macros?.fats ?? 0)
    }),
    { protein: 0, carbs: 0, fats: 0 }
  )
  const hasMacros = macros.protein > 0 || macros.carbs > 0 || macros.fats > 0

  const rawType = String(meal.mealType)
  const meta = MEAL_TYPE_META[rawType as MealTypeKey] ?? DEFAULT_MEAL_META

  const typeKey = "meal.form.meal_type." + rawType
  const translatedType = t(typeKey)
  const mealTypeLabel =
    translatedType === typeKey
      ? rawType.charAt(0).toUpperCase() + rawType.slice(1)
      : translatedType

  const parsedDate = new Date(meal.date)
  const formattedDate = Number.isNaN(parsedDate.getTime())
    ? meal.date
    : parsedDate.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric"
      })

  const preview = items
    .map((item) => item.food)
    .filter((food): food is string => Boolean(food))
    .join(", ")

  const handleOpenActions = useCallback(() => {
    Alert.alert(mealTypeLabel, formattedDate, [
      { text: t("common.actions.edit"), onPress: () => onEdit(meal) },
      {
        text: t("common.actions.delete"),
        style: "destructive",
        onPress: () => onDelete(meal)
      },
      { text: t("common.actions.cancel"), style: "cancel" }
    ])
  }, [mealTypeLabel, formattedDate, t, meal, onEdit, onDelete])

  const handleAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      switch (event.nativeEvent.actionName) {
        case "edit":
          onEdit(meal)
          break
        case "delete":
          onDelete(meal)
          break
      }
    },
    [meal, onEdit, onDelete]
  )

  const accessibilityLabel =
    mealTypeLabel +
    ", " +
    formattedDate +
    ", " +
    String(itemCount) +
    " " +
    t("meal.card.items") +
    ", " +
    String(totalCalories) +
    " " +
    t("meal.card.kcal")

  return (
    <Pressable
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={() => {
        triggerHaptic()
        onOpen(meal)
      }}
      onLongPress={editable ? handleOpenActions : undefined}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={t("meal.list.view_details")}
      accessibilityActions={
        editable ? [{ name: "edit" }, { name: "delete" }] : undefined
      }
      onAccessibilityAction={editable ? handleAccessibilityAction : undefined}
      className="w-full"
    >
      <Animated.View
        className="min-h-[168px] w-full overflow-hidden rounded-[18px] border border-border bg-card p-3"
        style={[CARD_STYLE, pressed && CARD_PRESSED_STYLE]}
      >
        <HStack className="items-start justify-between">
          <Box
            className={
              "h-8 w-8 items-center justify-center rounded-[10px] " +
              meta.surfaceClass
            }
          >
            <MealIcon size={18} color={colors[meta.colorKey]} />
          </Box>

          {editable ? (
            <Pressable
              onPress={handleOpenActions}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t("meal.card.more_options")}
              className="h-6 w-6 items-center justify-center active:opacity-50"
            >
              <Icon
                as={ThreeDotsIcon}
                size="sm"
                className="text-text-tertiary"
              />
            </Pressable>
          ) : null}
        </HStack>

        <Box className="flex-1" />

        <Text
          className={
            "text-[10px] font-bold uppercase tracking-[1.2px] " + meta.textClass
          }
          numberOfLines={1}
        >
          {mealTypeLabel}
        </Text>
        <Text
          className="mt-0.5 text-[14px] font-semibold text-text"
          numberOfLines={1}
        >
          {formattedDate}
        </Text>
        {preview ? (
          <Text
            className="mt-0.5 text-[11px] text-text-secondary"
            numberOfLines={1}
          >
            {preview}
          </Text>
        ) : null}

        <HStack className="mt-1.5 items-center gap-1.5">
          <Text className="text-[11px] font-semibold text-text-body">
            {String(itemCount) + " " + t("meal.card.items")}
          </Text>
          <Box className="h-1 w-1 rounded-full bg-text-tertiary" />
          <Text className="text-[11px] text-text-tertiary">
            {String(totalCalories) + " " + t("meal.card.kcal")}
          </Text>
        </HStack>

        {hasMacros ? (
          <Text
            className="mt-0.5 text-[10px] text-text-tertiary"
            numberOfLines={1}
          >
            {t("meal.item.protein_short") +
              " " +
              String(macros.protein) +
              "g"}
            {" \u00b7 "}
            {t("meal.item.carbs_short") + " " + String(macros.carbs) + "g"}
            {" \u00b7 "}
            {t("meal.item.fats_short") + " " + String(macros.fats) + "g"}
          </Text>
        ) : null}
      </Animated.View>
    </Pressable>
  )
}

export function MealsScreen() {
  const { t } = useI18n()
  const colors = useAppColors()
  const queryClient = useQueryClient()
  const router = useRouter()

  const [fabPressed, setFabPressed] = useState(false)

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
  const [formKey, setFormKey] = useState(0)

  const deleteMutation = useMutation({
    mutationFn: (id: number) => mealApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meals", "list"] })
    },
    onError: (err: Error) => {
      Alert.alert(t("common.errors.generic"), err.message)
    }
  })

  function openCreateModal() {
    setEditingMeal(null)
    setFormKey((k) => k + 1)
    setModalVisible(true)
  }

  function openEditModal(meal: Meal) {
    setEditingMeal(meal)
    setFormKey((k) => k + 1)
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
    setEditingMeal(null)
  }

  function handleSaved() {
    setModalVisible(false)
    setEditingMeal(null)
  }

  const renderMealItem = useCallback(
    ({ item }: ListRenderItemInfo<Meal>) => (
      <Box className="w-[48.5%]">
        <MealCard
          meal={item}
          editable={canEdit(item.createdAt)}
          onOpen={openDetail}
          onEdit={openEditModal}
          onDelete={handleDelete}
        />
      </Box>
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

  return (
    <Box className="flex-1 bg-background">
      <FlatList
        data={meals}
        numColumns={2}
        keyExtractor={mealKeyExtractor}
        renderItem={renderMealItem}
        columnWrapperStyle={
          meals.length > 0 ? { justifyContent: "space-between" } : undefined
        }
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
        <Pressable
          onPressIn={() => setFabPressed(true)}
          onPressOut={() => setFabPressed(false)}
          onPress={() => {
            triggerHaptic()
            openCreateModal()
          }}
          accessibilityRole="button"
          accessibilityLabel={t("meal.form.title")}
          className="absolute bottom-6 right-6"
        >
          <Animated.View
            className="h-14 w-14 items-center justify-center rounded-full bg-primary shadow-hard-2"
            style={[FAB_STYLE, fabPressed && FAB_PRESSED_STYLE]}
          >
            <Icon
              as={AddIcon}
              size="xl"
              className="h-7 w-7 text-primary-foreground"
            />
          </Animated.View>
        </Pressable>
      )}

      {/* Create/Edit Modal */}
      <MealFormModal
        key={formKey}
        visible={modalVisible}
        meal={editingMeal}
        onClose={handleCancel}
        onSaved={handleSaved}
      />
    </Box>
  )
}
