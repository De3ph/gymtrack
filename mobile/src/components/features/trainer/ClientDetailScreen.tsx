import { useState, useMemo } from "react";
import { ScrollView } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { trainerClientApi } from "@/api/trainerClientApi";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Button, Host } from "@expo/ui";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import { Center } from "@/components/ui/center";

type Tab = "overview" | "workouts" | "meals" | "measurements";

export function ClientDetailScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const [tab, setTab] = useState<Tab>("overview");

  const { data: stats, isLoading: loadingStats, isError: statsError, refetch: refetchStats } = useQuery({
    queryKey: ["clientStats", username],
    queryFn: () => trainerClientApi.getClientStats(username!),
    enabled: !!username && tab === "overview",
  });

  const { data: workouts, isLoading: loadingWorkouts, isError: workoutsError, refetch: refetchWorkouts } = useQuery({
    queryKey: ["clientWorkouts", username],
    queryFn: () => trainerClientApi.getClientWorkouts(username!),
    enabled: !!username && tab === "workouts",
  });

  const { data: meals, isLoading: loadingMeals, isError: mealsError, refetch: refetchMeals } = useQuery({
    queryKey: ["clientMeals", username],
    queryFn: () => trainerClientApi.getClientMeals(username!),
    enabled: !!username && tab === "meals",
  });

  const { data: measurements, isLoading: loadingMeasurements, isError: measurementsError, refetch: refetchMeasurements } = useQuery({
    queryKey: ["clientMeasurements", username],
    queryFn: () => trainerClientApi.getClientMeasurements(username!),
    enabled: !!username && tab === "measurements",
  });

  const tabs: Tab[] = ["overview", "workouts", "meals", "measurements"];
  const tabQueries: Record<Tab, { loading: boolean; error: boolean }> = {
    overview: { loading: loadingStats, error: statsError },
    workouts: { loading: loadingWorkouts, error: workoutsError },
    meals: { loading: loadingMeals, error: mealsError },
    measurements: { loading: loadingMeasurements, error: measurementsError },
  };
  const isLoading = tabQueries[tab].loading;
  const isError = tabQueries[tab].error;
  const st = stats as { totalWorkouts?: number; totalMeals?: number; consistency?: number; totalVolume?: number };

  const refetchFailed = () => {
    if (statsError) refetchStats();
    if (workoutsError) refetchWorkouts();
    if (mealsError) refetchMeals();
    if (measurementsError) refetchMeasurements();
  };

  const workoutItems = useMemo(() => {
    return (workouts as { workouts?: { workoutId?: number; date?: string; exercises?: unknown[] }[] })?.workouts ?? [];
  }, [workouts]);

  const mealItems = useMemo(() => {
    return (meals as { meals?: { mealId?: number; date?: string; mealType?: string; items?: unknown[] }[] })?.meals ?? [];
  }, [meals]);

  const measurementItems = useMemo(() => {
    return (measurements as { measurements?: { measurementId?: number; date?: string; weight?: number }[] })?.measurements ?? [];
  }, [measurements]);

  const renderWorkoutItem = ({ item }: { item: { workoutId?: number; date?: string; exercises?: unknown[] } }) => (
    <Box className="mb-2 rounded-xl border border-border bg-card p-3.5">
      <Text className="text-[15px] font-semibold text-text">{item.date}</Text>
      <Text className="mt-1 text-[13px] text-text-secondary">{item.exercises?.length ?? 0} exercises</Text>
    </Box>
  );

  const renderMealItem = ({ item }: { item: { mealId?: number; date?: string; mealType?: string; items?: unknown[] } }) => (
    <Box className="mb-2 rounded-xl border border-border bg-card p-3.5">
      <Text className="text-[15px] font-semibold text-text">{item.mealType} - {item.date}</Text>
      <Text className="mt-1 text-[13px] text-text-secondary">{item.items?.length ?? 0} items</Text>
    </Box>
  );

  const renderMeasurementItem = ({ item }: { item: { measurementId?: number; date?: string; weight?: number } }) => (
    <Box className="mb-2 rounded-xl border border-border bg-card p-3.5">
      <Text className="text-[15px] font-semibold text-text">{item.date}</Text>
      <Text className="mt-1 text-[13px] text-text-secondary">{item.weight ? `${item.weight} kg` : "N/A"}</Text>
    </Box>
  );

  const keyExtractorWorkout = (item: { workoutId?: number; date?: string }) => String(item.workoutId ?? "");
  const keyExtractorMeal = (item: { mealId?: number; date?: string }) => String(item.mealId ?? "");
  const keyExtractorMeasurement = (item: { measurementId?: number; date?: string }) => String(item.measurementId ?? "");

  return (
    <Box className="flex-1 bg-background">
      <HStack className="border-b border-border bg-card">
        {tabs.map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            className={`flex-1 items-center py-3.5 ${tab === t ? "border-b-2 border-b-primary" : ""}`}
          >
            <Text className={`text-[13px] font-semibold capitalize ${tab === t ? "text-primary" : "text-text-secondary"}`}>{t}</Text>
          </Pressable>
        ))}
      </HStack>

      {isLoading ? (
        <Center className="flex-1">
          <Spinner size="large" />
        </Center>
      ) : isError ? (
        <Center className="flex-1">
          <Box className="mb-4 rounded border-l-4 border-l-danger bg-danger-surface p-3">
            <Text className="text-sm font-medium text-danger-text">Failed to load</Text>
          </Box>
          <Host matchContents>
            <Button label="Retry" onPress={refetchFailed} />
          </Host>
        </Center>
      ) : (
        <ScrollView
          className="flex-1 bg-background"
          contentContainerClassName="p-4"
        >
          {tab === "overview" && st && (
            <Box className="flex-row flex-wrap gap-2.5">
              <Box className="min-w-[45%] flex-1 items-center rounded-xl border border-border bg-card p-4">
                <Text className="text-2xl font-extrabold text-primary">{st.totalWorkouts ?? 0}</Text>
                <Text className="mt-1 text-xs font-semibold text-text-secondary">Workouts</Text>
              </Box>
              <Box className="min-w-[45%] flex-1 items-center rounded-xl border border-border bg-card p-4">
                <Text className="text-2xl font-extrabold text-primary">{st.totalMeals ?? 0}</Text>
                <Text className="mt-1 text-xs font-semibold text-text-secondary">Meals</Text>
              </Box>
              <Box className="min-w-[45%] flex-1 items-center rounded-xl border border-border bg-card p-4">
                <Text className="text-2xl font-extrabold text-primary">{st.consistency ?? 0}%</Text>
                <Text className="mt-1 text-xs font-semibold text-text-secondary">Consistency</Text>
              </Box>
              <Box className="min-w-[45%] flex-1 items-center rounded-xl border border-border bg-card p-4">
                <Text className="text-2xl font-extrabold text-primary">{st.totalVolume ?? 0}</Text>
                <Text className="mt-1 text-xs font-semibold text-text-secondary">Volume</Text>
              </Box>
            </Box>
          )}
          {tab === "workouts" && (
            <FlashList
              data={workoutItems}
              keyExtractor={keyExtractorWorkout}
              renderItem={renderWorkoutItem}
              scrollEnabled={false}
              ListEmptyComponent={<Text className="mt-10 text-center text-sm text-text-secondary">No workouts</Text>}
            />
          )}
          {tab === "meals" && (
            <FlashList
              data={mealItems}
              keyExtractor={keyExtractorMeal}
              renderItem={renderMealItem}
              scrollEnabled={false}
              ListEmptyComponent={<Text className="mt-10 text-center text-sm text-text-secondary">No meals</Text>}
            />
          )}
          {tab === "measurements" && (
            <FlashList
              data={measurementItems}
              keyExtractor={keyExtractorMeasurement}
              renderItem={renderMeasurementItem}
              scrollEnabled={false}
              ListEmptyComponent={<Text className="mt-10 text-center text-sm text-text-secondary">No measurements</Text>}
            />
          )}
        </ScrollView>
      )}
    </Box>
  );
}
