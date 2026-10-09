import { Stack } from "expo-router";
import { WorkoutDetailScreen } from "@/components/features/workout/WorkoutDetailScreen";

export default function WorkoutDetailPage() {
  return (
    <>
      {/* The screen renders its own themed back button; a native header here
          would duplicate it and defaults to an unthemed white bar. */}
      <Stack.Screen options={{ headerShown: false }} />
      <WorkoutDetailScreen />
    </>
  );
}
