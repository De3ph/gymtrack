import { Platform } from "react-native";
import { Tabs } from "expo-router";
import * as Haptics from "expo-haptics";

import {
  HomeIcon,
  MealIcon,
  MeasurementIcon,
  ProfileIcon,
  WorkoutIcon,
} from "@/components/icons";
import { useThemeColors } from "@/components/useThemeColors";

export type TabsParamList = {
  index: undefined;
  workouts: undefined;
  meals: undefined;
  measurements: undefined;
  profile: undefined;
};

const TAB_ICON_SIZE = Platform.OS === "ios" ? 26 : 24;

export default function TabLayout() {
  const c = useThemeColors();

  return (
    <Tabs
      screenListeners={{
        tabPress: () => {
          void Haptics.selectionAsync();
        },
      }}
      screenOptions={{
        tabBarActiveTintColor: c.tabIconSelected,
        tabBarInactiveTintColor: c.tabIconDefault,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: {
          backgroundColor: c.card,
          borderTopColor: c.border,
          ...Platform.select({
            ios: {
              height: 88,
            },
            android: {
              height: 64,
              elevation: 8,
            },
          }),
        },
        sceneStyle: { backgroundColor: c.background },
        headerStyle: { backgroundColor: c.card },
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: "600", fontSize: 17 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <HomeIcon size={TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: "Workouts",
          tabBarIcon: ({ color }) => (
            <WorkoutIcon size={TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: "Meals",
          tabBarIcon: ({ color }) => (
            <MealIcon size={TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="measurements"
        options={{
          title: "Measurements",
          tabBarIcon: ({ color }) => (
            <MeasurementIcon size={TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <ProfileIcon size={TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
