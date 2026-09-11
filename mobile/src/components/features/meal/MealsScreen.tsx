import React, { useState, useCallback } from "react";
import {
  FlatList,
  RefreshControl,
  ListRenderItemInfo,
  Alert
} from "react-native"
import { useRouter, type Href } from "expo-router"
import { useI18n } from "@/lib/i18n"
import { mealApi } from "@/api/mealApi"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Meal, MealListResponse } from "@/types"
import { canEdit } from "@/lib/canEdit"
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Button, Host } from "@expo/ui";
import { Badge, BadgeText } from "@/components/ui/badge";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import { Icon, AddIcon } from "@/components/ui/icon";
import { Center } from "@/components/ui/center";
import { MealIcon } from "@/components/icons";
import { useAppColors } from "@/lib/colors";
import { isSessionExpiredError } from "@/api/client";
import { SessionExpiredView } from "@/components/features/auth/SessionExpiredView";
import { MealFormModal } from "@/components/features/meal/MealFormModal";

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
        <Pressable
          onPress={openCreateModal}
          className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-hard-2"
        >
          <Icon
            as={AddIcon}
            size="xl"
            className="h-7 w-7 text-primary-foreground"
          />
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
