import { useCallback, memo, useState } from "react";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { cubicBezier } from "react-native-reanimated";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { Host, Text as ExpoText } from "@expo/ui";
import {
  MealIcon,
  MeasurementIcon,
  TrainerIcon,
  WorkoutIcon,
  type AppIcon,
} from "@/components/icons";
import { useI18n } from "@/lib/i18n";
import { useAppColors } from "@/lib/colors";

type QuickActionRoute = "/(tabs)/workouts" | "/(tabs)/meals" | "/(tabs)/measurements" | "/trainer-catalog";

interface QuickAction {
  key: string;
  Icon: AppIcon;
  iconColor: string;
  route: QuickActionRoute;
}

function triggerHaptic() {
  if (Platform.OS === "ios") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

const CARD_STYLE = {
  transform: [{ scale: 1 }],
  transitionProperty: "transform" as const,
  transitionDuration: 120,
  transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
};

const CARD_PRESSED_STYLE = {
  transform: [{ scale: 0.97 }],
};

interface ActionCardProps {
  action: QuickAction;
  label: string;
  onPress: (route: QuickActionRoute) => void;
}

const ActionCard = memo(function ActionCard({ action, label, onPress }: ActionCardProps) {
  const colors = useAppColors();
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={() => {
        triggerHaptic();
        onPress(action.route);
      }}
      className="flex-1 basis-[47%]"
    >
      <Animated.View
        className="items-center gap-3 rounded-2xl border border-border bg-card p-4"
        style={[CARD_STYLE, pressed && CARD_PRESSED_STYLE]}
      >
        <action.Icon size={30} color={action.iconColor} />
        <Text style={{ fontSize: 14, fontWeight: "bold", textAlign: "center", color: colors.text }}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
});

interface QuickActionsProps {
  title?: string;
}

export const QuickActions = memo(function QuickActions({ title }: QuickActionsProps) {
  const { t } = useI18n();
  const { push } = useRouter();
  const colors = useAppColors();

  const sectionTitleStyle = {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "bold",
    color: colors.text,
  } as const;

  const QUICK_ACTIONS: QuickAction[] = [
    {
      key: "workouts",
      Icon: WorkoutIcon,
      iconColor: colors.accent,
      route: "/(tabs)/workouts",
    },
    {
      key: "meals",
      Icon: MealIcon,
      iconColor: colors.success,
      route: "/(tabs)/meals",
    },
    {
      key: "measurements",
      Icon: MeasurementIcon,
      iconColor: colors.warning,
      route: "/(tabs)/measurements",
    },
    {
      key: "trainers",
      Icon: TrainerIcon,
      iconColor: colors.textSecondary,
      route: "/trainer-catalog",
    },
  ];

  const handlePress = useCallback((route: QuickActionRoute) => {
    push(route);
  }, [push]);

  const sectionTitle = title ?? t("dashboard.quick_actions");

  return (
    <VStack space="md">
      <Host matchContents>
        <ExpoText textStyle={sectionTitleStyle}>{sectionTitle}</ExpoText>
      </Host>
      <Box className="flex-row flex-wrap gap-3">
        {QUICK_ACTIONS.map((action) => (
          <ActionCard
            key={action.key}
            action={action}
            label={t("common.navigation." + action.key)}
            onPress={handlePress}
          />
        ))}
      </Box>
    </VStack>
  );
});
