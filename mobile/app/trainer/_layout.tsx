import { Stack } from "expo-router";

export default function TrainerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="clients" />
      <Stack.Screen name="plans" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="requests" />
      <Stack.Screen name="client/[username]" />
      <Stack.Screen name="plans/[id]" />
    </Stack>
  );
}
