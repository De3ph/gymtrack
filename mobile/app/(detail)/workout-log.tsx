import { Stack } from "expo-router";
import { ActiveWorkoutScreen } from "@/components/features/workout/ActiveWorkoutScreen";

export default function WorkoutLogPage() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ActiveWorkoutScreen />
    </>
  );
}
