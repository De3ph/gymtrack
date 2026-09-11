import { FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { workoutPlanApi } from "@/api/workoutPlanApi";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Button, Host } from "@expo/ui";
import { Spinner } from "@/components/ui/spinner";
import { Pressable } from "@/components/ui/pressable";
import { Center } from "@/components/ui/center";

interface Plan {
  planId?: number;
  name?: string;
  description?: string;
  exercises?: unknown[];
}

export function MyWorkoutPlansScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["myPlans"],
    queryFn: () => workoutPlanApi.getMyPlans(),
  });

  const plans: Plan[] = (data as { plans?: Plan[] })?.plans ?? [];

  const renderItem = ({ item }: { item: Plan }) => (
    <Pressable
      onPress={() => router.push(`/trainer/plans/${item.planId}`)}
      className="mb-2 rounded-xl bg-card p-4"
    >
      <Text className="mb-1 text-base font-bold text-text">{item.name}</Text>
      {item.description ? (
        <Text className="mb-1.5 text-[13px] text-text-secondary" numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}
      <Text className="text-xs font-semibold text-primary">
        {item.exercises?.length ?? 0} exercises
      </Text>
    </Pressable>
  );

  return (
    <Box className="flex-1 bg-background">
      {isLoading ? (
        <Center className="flex-1 p-6">
          <Spinner />
        </Center>
      ) : isError ? (
        <Center className="flex-1 p-6">
          <Text className="mb-3 text-[15px] text-danger">Failed to load plans</Text>
          <Host matchContents>
            <Button label="Retry" onPress={() => refetch()} />
          </Host>
        </Center>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(item) => String(item.planId ?? "")}
          renderItem={renderItem}
          contentContainerClassName="gap-3 p-4"
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
          ListEmptyComponent={
            <Center className="flex-1 p-6">
              <Text className="text-[15px] text-text-tertiary">No assigned plans</Text>
            </Center>
          }
        />
      )}
    </Box>
  );
}
