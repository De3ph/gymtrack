import { Stack } from "expo-router";
import { ExercisesScreen } from "@/components/features/exercise/ExercisesScreen";

export default function ExercisesPage() {
  return (
    <>
      {/* The screen renders its own header block; a native header here would
          duplicate it and defaults to an unthemed white bar. */}
      <Stack.Screen options={{ headerShown: false }} />
      <ExercisesScreen />
    </>
  );
}
