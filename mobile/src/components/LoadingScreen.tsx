import { memo } from "react";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Spinner } from "@/components/ui/spinner";

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen = memo(function LoadingScreen({
  message = "Loading…",
}: LoadingScreenProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      className="flex-1 bg-background"
    >
      <Box className="flex-1 items-center justify-center" accessibilityLabel="Loading">
        <VStack space="md" className="items-center">
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <Spinner size="large" className="text-primary" />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <Text className="text-sm text-text-tertiary">
              {message}
            </Text>
          </Animated.View>
        </VStack>
      </Box>
    </Animated.View>
  );
});
