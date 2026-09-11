import { useCallback, useMemo } from "react";
import { RefreshControl } from "react-native";
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { mealApi } from "@/api/mealApi";
import { useI18n } from "@/lib/i18n";
import { CommentSection } from "@/components/features/comments/CommentSection";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Button, Host } from "@expo/ui";
import { Badge, BadgeText } from "@/components/ui/badge";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import { Center } from "@/components/ui/center";
import type { Meal, MealItem } from "@/types";

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: "bg-warning-surface",
  lunch: "bg-primary-surface",
  dinner: "bg-info-surface",
  snack: "bg-success-surface",
};

const MEAL_TYPE_TEXT_COLORS: Record<string, string> = {
  breakfast: "text-warning-text",
  lunch: "text-primary-text",
  dinner: "text-info-text",
  snack: "text-success-text",
};

interface FoodItemCardProps {
  item: MealItem;
}

function FoodItemCard({ item }: FoodItemCardProps) {
  return (
    <Box className="rounded-[12px] border border-border bg-card p-4">
      <HStack className="items-start justify-between">
        <Text className="flex-1 text-[15px] font-semibold text-text">
          {item.food}
        </Text>
        {item.calories ? (
          <Badge className="ml-2 rounded-full bg-surface-subtle px-2 py-0.5">
            <BadgeText className="text-[11px] font-semibold text-text-secondary">
              {String(item.calories)} kcal
            </BadgeText>
          </Badge>
        ) : null}
      </HStack>

      <Text className="mt-1 text-[13px] text-text-secondary">
        {item.quantity}
      </Text>

      {item.macros ? (
        <HStack className="mt-2.5 gap-3">
          <MacroPill label="P" value={item.macros.protein} />
          <MacroPill label="C" value={item.macros.carbs} />
          <MacroPill label="F" value={item.macros.fats} />
        </HStack>
      ) : null}
    </Box>
  );
}

function MacroPill({ label, value }: { label: string; value?: number }) {
  if (value == null) return null;
  return (
    <HStack className="items-center gap-1 rounded-md bg-surface-subtle px-2 py-1">
      <Text className="text-[11px] font-bold text-text-tertiary">{label}</Text>
      <Text className="text-[12px] font-medium text-text-body">
        {String(value)}g
      </Text>
    </HStack>
  );
}

const ItemSeparator = () => <Box className="h-2" />;

export function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();

  const {
    data: meal,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<Meal>({
    queryKey: ["meal", id],
    queryFn: () => mealApi.getById(id!) as Promise<Meal>,
    enabled: !!id,
  });

  const formattedDate = useMemo(() => {
    if (!meal?.date) return "";
    return new Date(meal.date).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [meal?.date]);

  const totalCalories = useMemo(() => {
    return (
      meal?.items?.reduce((sum, item) => sum + (item.calories ?? 0), 0) ?? 0
    );
  }, [meal?.items]);

  const totalMacros = useMemo(() => {
    if (!meal?.items) return { protein: 0, carbs: 0, fats: 0 };
    return meal.items.reduce(
      (acc, item) => ({
        protein: acc.protein + (item.macros?.protein ?? 0),
        carbs: acc.carbs + (item.macros?.carbs ?? 0),
        fats: acc.fats + (item.macros?.fats ?? 0),
      }),
      { protein: 0, carbs: 0, fats: 0 }
    );
  }, [meal?.items]);

  const mealTypeLabel = useMemo(() => {
    if (!meal?.mealType) return "";
    const raw = String(meal.mealType);
    return MEAL_TYPE_LABELS[raw] ?? raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [meal?.mealType]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const contentContainerStyle = useMemo(
    () => ({ paddingHorizontal: 20, paddingBottom: 48 }),
    []
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<MealItem>) => (
      <FoodItemCard item={item} />
    ),
    []
  );

  const keyExtractor = useCallback(
    (item: MealItem, index: number) =>
      item.food + "-" + String(index),
    []
  );

  if (isLoading) {
    return (
      <Center className="flex-1 bg-background">
        <Spinner size="large" />
      </Center>
    );
  }

  if (isError || !meal) {
    return (
      <Center className="flex-1 bg-background p-6">
        <Text className="mb-4 text-5xl">!</Text>
        <Text className="mb-4 text-center text-[15px] text-danger">
          {t("common.errors.generic")}
        </Text>
        <Host matchContents>
          <Button label={t("common.actions.retry")} onPress={handleRefresh} />
        </Host>
      </Center>
    );
  }

  const mealColorClass =
    MEAL_TYPE_COLORS[String(meal.mealType)] ?? "bg-surface-subtle";
  const mealTextColorClass =
    MEAL_TYPE_TEXT_COLORS[String(meal.mealType)] ?? "text-text-secondary";

  const headerComponent = (
    <>
      <Box className="mb-3">
        <Pressable onPress={handleBack} className="self-start py-2">
          <Text className="text-base font-semibold text-primary">
            {"\u2039"} {t("common.actions.back")}
          </Text>
        </Pressable>
      </Box>

      <HStack className="mb-1 items-center justify-between">
        <Text className="flex-1 text-[22px] font-bold text-text">
          {formattedDate}
        </Text>
        <Badge className={`ml-2 rounded-full px-3 py-1 ${mealColorClass}`}>
          <BadgeText className={`text-xs font-bold ${mealTextColorClass}`}>
            {mealTypeLabel}
          </BadgeText>
        </Badge>
      </HStack>

      <HStack className="mb-5 items-center gap-3">
        <Text className="text-sm text-text-secondary">
          {String(totalCalories)} {t("meal.card.kcal")}
        </Text>
        {(totalMacros.protein > 0 ||
          totalMacros.carbs > 0 ||
          totalMacros.fats > 0) && (
          <>
            <Text className="text-text-tertiary">|</Text>
            <Text className="text-[13px] text-text-tertiary">
              P {String(totalMacros.protein)}g &middot; C{" "}
              {String(totalMacros.carbs)}g &middot; F{" "}
              {String(totalMacros.fats)}g
            </Text>
          </>
        )}
      </HStack>

      <Text className="mb-3 text-[11px] font-bold uppercase tracking-[1.5px] text-text-tertiary">
        {t("meal.card.items")} ({meal.items?.length ?? 0})
      </Text>
    </>
  );

  const footerComponent = (
    <Box className="mt-2">
      <CommentSection targetType="meal" targetId={id!} />
    </Box>
  );

  return (
    <Box className="flex-1 bg-background">
      <FlashList
        data={meal.items ?? []}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={headerComponent}
        ListFooterComponent={footerComponent}
        contentContainerStyle={contentContainerStyle}
        ItemSeparatorComponent={ItemSeparator}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
        }
      />
    </Box>
  );
}
