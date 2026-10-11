import { Stack } from "expo-router";
import { ExerciseDetailScreen } from "@/components/features/exercise/ExerciseDetailScreen";

export default function ExerciseDetailPage() {
  return (
    <>
      {/* The screen renders its own themed back button; a native header here
          would duplicate it and defaults to an unthemed white bar. */}
      <Stack.Screen options={{ headerShown: false }} />
      <ExerciseDetailScreen />
    </>
  );
}
