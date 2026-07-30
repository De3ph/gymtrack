import { Stack } from "expo-router";

export default function AthleteLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="requests" />
      <Stack.Screen name="workout-plans" />
      <Stack.Screen name="my-trainer/[id]" />
    </Stack>
  );
}
