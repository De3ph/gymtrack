import { Stack } from "expo-router";
import { MealDetailScreen } from "@/components/features/meal/MealDetailScreen";
import { DetailBackHeader } from "@/components/DetailBackHeader";

export default function MealDetailPage() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "",
          headerLeft: () => <DetailBackHeader />,
        }}
      />
      <MealDetailScreen />
    </>
  );
}
