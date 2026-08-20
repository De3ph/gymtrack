import { Pressable, Text } from "react-native";
import { Stack, useRouter } from "expo-router";
import { MealDetailScreen } from "@/components/features/meal/MealDetailScreen";
import { useI18n } from "@/lib/i18n";
import { useThemeColors } from "@/components/useThemeColors";

export default function MealDetailPage() {
  const router = useRouter();
  const { t } = useI18n();
  const c = useThemeColors();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "",
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              style={{ paddingVertical: 4 }}
            >
              <Text
                style={{ fontSize: 16, color: c.accent, fontWeight: "600" }}
              >
                {"\u2039"} {t("common.actions.back")}
              </Text>
            </Pressable>
          ),
        }}
      />
      <MealDetailScreen />
    </>
  );
}