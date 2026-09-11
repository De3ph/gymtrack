import { memo, useCallback, useMemo } from "react";
import { I18nManager } from "react-native";
import { useRouter } from "expo-router";
import { impactAsync, ImpactFeedbackStyle } from "expo-haptics";
import { Button, Host, RNHostView, Row, Text } from "@expo/ui";
import { useI18n } from "@/lib/i18n";
import { ChevronLeftIcon } from "@/components/ui/icon";
import { useAppColors } from "@/lib/colors";

/**
 * Native back button for detail-stack headers.
 *
 * Rendered via `@expo/ui` universal `Button` (SwiftUI on iOS,
 * Jetpack Compose on Android) so press states, ripples and
 * screen-reader traits come from the platform instead of JS.
 * Memoized + `Host matchContents` keeps `headerLeft` re-evaluations cheap.
 */
export const DetailBackHeader = memo(function DetailBackHeader() {
  const router = useRouter();
  const { t } = useI18n();
  const colors = useAppColors();

  const label = t("common.actions.back");

  const handlePress = useCallback(() => {
    if (process.env.EXPO_OS === "ios") {
      void impactAsync(ImpactFeedbackStyle.Light);
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  }, [router]);

  const labelStyle = useMemo(
    () => ({ fontSize: 17, fontWeight: "600" as const, color: colors.accent }),
    [colors],
  );

  const buttonStyle = useMemo(
    () => ({ height: 44, paddingHorizontal: 12, paddingVertical: 8 }) as const,
    [],
  );

  const iconWrapStyle = useMemo(
    () => ({
      width: 20,
      height: 20,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }],
    }),
    [],
  );

  return (
    <Host matchContents>
      <Button
        variant="text"
        onPress={handlePress}
        style={buttonStyle}
        testID="detail-back-header"
      >
        <Row spacing={2} alignment="center">
          <RNHostView style={iconWrapStyle}>
            <ChevronLeftIcon size="md" className="text-brand" />
          </RNHostView>
          <Text textStyle={labelStyle} numberOfLines={1}>
            {label}
          </Text>
        </Row>
      </Button>
    </Host>
  );
});
