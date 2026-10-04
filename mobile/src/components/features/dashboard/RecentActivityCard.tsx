import { memo, useCallback } from "react";
import { Box } from "@/components/ui/box";
import { Column, RNHostView, Row, Spacer, Text } from "@expo/ui";
import { MealIcon, WorkoutIcon, type AppIcon } from "@/components/icons";
import { useAppColors } from "@/lib/colors";

export type RecentActivityType = "workout" | "meal";

const ACTIVITY_ICONS: Record<RecentActivityType, AppIcon> = {
  workout: WorkoutIcon,
  meal: MealIcon,
};

const cardStyle = (colors: ReturnType<typeof useAppColors>) =>
  ({
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  }) as const;

const titleStyle = (colors: ReturnType<typeof useAppColors>) =>
  ({
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "bold",
    color: colors.text,
  }) as const;

const dateStyle = (colors: ReturnType<typeof useAppColors>) =>
  ({ fontSize: 12, color: colors.textSecondary }) as const;

const badgeStyle = (colors: ReturnType<typeof useAppColors>) =>
  ({
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  }) as const;

const statStyle = (colors: ReturnType<typeof useAppColors>) =>
  ({
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  }) as const;

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});

export interface RecentActivityCardProps {
  type: RecentActivityType;
  id?: number;
  title: string;
  date: string;
  statLine: string;
  onPress: (type: RecentActivityType, id?: number) => void;
}

export const RecentActivityCard = memo(function RecentActivityCard({
  type,
  id,
  title,
  date,
  statLine,
  onPress,
}: RecentActivityCardProps) {
  const colors = useAppColors();
  const handlePress = useCallback(() => onPress(type, id), [onPress, type, id]);
  const Icon = ACTIVITY_ICONS[type];

  return (
    <Row
      onPress={handlePress}
      alignment="center"
      spacing={12}
      style={cardStyle(colors)}
    >
      <RNHostView matchContents>
        <Box className="size-10 items-center justify-center rounded-full bg-surface-subtle">
          <Icon size={20} color={colors.text} />
        </Box>
      </RNHostView>
      <Column spacing={4}>
        <Text textStyle={titleStyle(colors)}>{title}</Text>
        <Text textStyle={dateStyle(colors)}>
          {dateFormatter.format(new Date(date))}
        </Text>
      </Column>
      <Spacer flexible />
      <Column alignment="center" style={badgeStyle(colors)}>
        <Text textStyle={statStyle(colors)}>{statLine}</Text>
      </Column>
    </Row>
  );
});
