import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { useI18n } from "@/lib/i18n";
import { useThemeColors } from "@/components/useThemeColors";

export function DetailBackHeader() {
  const router = useRouter();
  const { t } = useI18n();
  const c = useThemeColors();

  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={8}
      style={{ paddingVertical: 4 }}
    >
      <Text style={{ fontSize: 16, color: c.accent, fontWeight: "600" }}>
        {"\u2039"} {t("common.actions.back")}
      </Text>
    </Pressable>
  );
}
