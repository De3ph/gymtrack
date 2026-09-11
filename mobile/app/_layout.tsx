import "../global.css";

import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PortalHost } from "@rn-primitives/portal";

import { useAuthStore } from "@/stores/authStore";
import { useThemeStore } from "@/stores/themeStore";
import { useInitializeAuth } from "@/hooks/useAuth";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { I18nProvider } from "@/lib/i18n";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { Colors } from "@/constants/Colors";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const theme = useThemeStore((s) => s.theme);
  const systemScheme = useColorScheme();
  const scheme: "light" | "dark" =
    theme === "system" ? (systemScheme === "dark" ? "dark" : "light") : theme;

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(Colors[scheme].background);
  }, [scheme]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <I18nProvider>
        <GluestackUIProvider mode={theme}>
          <StatusBar style={scheme === "dark" ? "light" : "dark"} />
          <QueryClientProvider client={queryClient}>
            <SafeAreaProvider>
              <AppNavigator />
              <PortalHost />
            </SafeAreaProvider>
          </QueryClientProvider>
        </GluestackUIProvider>
      </I18nProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

function AppNavigator() {
  const { isAuthenticated, isInitialized } = useAuthStore();

  useInitializeAuth();

  if (!isInitialized) return <LoadingScreen />;

  if (!isAuthenticated) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
      </Stack>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="trainer" />
      <Stack.Screen name="trainer-catalog" />
      <Stack.Screen name="athlete" />
    </Stack>
  );
}
