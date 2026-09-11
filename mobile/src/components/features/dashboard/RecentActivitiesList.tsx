import { memo, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Column, Host, RNHostView, Text } from "@expo/ui";
import { useI18n } from "@/lib/i18n";
import { useAppColors } from "@/lib/colors";
import type { Meal, Workout } from "@/types";
import {
  RecentActivityCard,
  type RecentActivityType,
} from "./RecentActivityCard";

const DOT = String.fromCharCode(183);
const MAX_ITEMS = 10;

interface RecentActivityItem {
  type: RecentActivityType;
  data: Workout | Meal;
  date: string;
}

interface RecentActivitiesListProps {
  workouts: Workout[];
  meals: Meal[];
  onOpenActivity: (type: RecentActivityType) => void;
}

export const RecentActivitiesList = memo(function RecentActivitiesList({
  workouts,
  meals,
  onOpenActivity,
}: RecentActivitiesListProps) {
  const { t } = useI18n();
  const colors = useAppColors();

  const sectionTitleStyle = {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "bold",
    color: colors.text,
  } as const;

  const emptyTitleStyle = {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "bold",
    color: colors.text,
  } as const;

  const emptyBodyStyle = {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    color: colors.textSecondary,
  } as const;

  const activities = useMemo(() => {
    const items: RecentActivityItem[] = [];
    workouts.forEach((w) => items.push({ type: "workout", data: w, date: w.date }));
    meals.forEach((m) => items.push({ type: "meal", data: m, date: m.date }));
    items.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    return items.slice(0, MAX_ITEMS);
  }, [workouts, meals]);

  return (
    <Column spacing={12}>
      <Text textStyle={sectionTitleStyle}>
        {t("dashboard.recent.activities")}
      </Text>
      {activities.length === 0 ? (
        <RNHostView matchContents>
          <Card className="items-center border-dashed p-8">
            <Host matchContents>
              <Column spacing={4} alignment="center">
                <Text textStyle={emptyTitleStyle}>
                  {t("dashboard.no_data.title")}
                </Text>
                <Text textStyle={emptyBodyStyle}>
                  {t("dashboard.no_data.description")}
                </Text>
              </Column>
            </Host>
          </Card>
        </RNHostView>
      ) : (
        <Column spacing={8}>
          {activities.map((item, idx) => {
            const workout =
              item.type === "workout" ? (item.data as Workout) : null;
            const meal = item.type === "meal" ? (item.data as Meal) : null;
            const totalSets =
              workout?.exercises?.reduce(
                (acc, ex) => acc + (ex.sets?.length ?? 0),
                0,
              ) ?? 0;
            const totalCal =
              meal?.items?.reduce((sum, fi) => sum + (fi.calories ?? 0), 0) ?? 0;
            const statLine = workout
              ? `${totalSets} sets ${DOT} ${workout.exercises?.length ?? 0} ex`
              : `${totalCal} kcal ${DOT} ${meal?.items?.length ?? 0} items`;
            return (
              <RecentActivityCard
                key={item.type + "-" + idx}
                type={item.type}
                title={
                  item.type === "workout"
                    ? t("common.navigation.workouts")
                    : t("common.navigation.meals")
                }
                date={item.date}
                statLine={statLine}
                onPress={onOpenActivity}
              />
            );
          })}
        </Column>
      )}
    </Column>
  );
});
