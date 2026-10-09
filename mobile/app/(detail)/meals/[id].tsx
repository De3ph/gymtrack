import { Stack } from "expo-router";
import { MealDetailScreen } from "@/components/features/meal/MealDetailScreen";

export default function MealDetailPage() {
  return (
    <>
      {/* The screen renders its own themed back button; a native header here
          would duplicate it and defaults to an unthemed white bar. */}
      <Stack.Screen options={{ headerShown: false }} />
      <MealDetailScreen />
    </>
  );
}
