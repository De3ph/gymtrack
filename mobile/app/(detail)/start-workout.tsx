import { Stack } from "expo-router";
import { StartWorkoutScreen } from "@/components/features/workout/StartWorkoutScreen";

export default function StartWorkoutPage() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StartWorkoutScreen />
    </>
  );
}
