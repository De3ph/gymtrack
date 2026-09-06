import { Stack } from "expo-router";
import { WorkoutDetailScreen } from "@/components/features/workout/WorkoutDetailScreen";
import { DetailBackHeader } from "@/components/DetailBackHeader";

export default function WorkoutDetailPage() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "",
          headerLeft: () => <DetailBackHeader />,
        }}
      />
      <WorkoutDetailScreen />
    </>
  );
}
