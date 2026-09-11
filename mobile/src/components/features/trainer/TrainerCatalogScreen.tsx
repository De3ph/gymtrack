import { useState, useMemo, useCallback } from "react";
import { RefreshControl } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { trainerCatalogApi } from "@/api/trainerCatalogApi";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Button, Host } from "@expo/ui";
import { Input, InputField } from "@/components/ui/input";
import { Badge, BadgeText } from "@/components/ui/badge";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";

interface TrainerItem {
  userId?: number;
  username?: string;
  profile?: { name?: string; bio?: string; specializations?: string };
}

export function TrainerCatalogScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["trainers", search],
    queryFn: () => trainerCatalogApi.searchTrainers(search ? { specialization: search } : undefined),
  });

  const trainers = useMemo(() => {
    const result = data as { trainers?: TrainerItem[] };
    return result.trainers ?? [];
  }, [data]);

  const renderTrainer = useCallback(
    ({ item }: { item: TrainerItem }) => (
      <Pressable
        onPress={() => router.push(`/trainer-catalog/${item.userId}`)}
        className="rounded-xl border border-border bg-card p-4"
      >
        <HStack space="md" className="mb-2.5 items-center">
          <Box className="h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Text className="text-xl font-bold text-primary-foreground">
              {(item.username ?? "?")[0].toUpperCase()}
            </Text>
          </Box>
          <VStack className="flex-1">
            <Text className="text-base font-bold text-text">
              {item.profile?.name ?? item.username}
            </Text>
            {item.profile?.bio ? (
              <Text className="mt-0.5 text-[13px] text-text-secondary" numberOfLines={2}>
                {item.profile.bio}
              </Text>
            ) : null}
          </VStack>
        </HStack>
        {item.profile?.specializations ? (
          <HStack space="xs" className="flex-wrap">
            {String(item.profile.specializations).split(",").map((s, i) => (
              <Badge key={i} className="rounded-md bg-brand-surface px-2 py-0.5">
                <BadgeText className="text-[11px] font-semibold text-brand-on-light">
                  {s.trim()}
                </BadgeText>
              </Badge>
            ))}
          </HStack>
        ) : null}
      </Pressable>
    ),
    [router]
  );

  const keyExtractor = useCallback((item: TrainerItem) => String(item.userId ?? ""), []);

  return (
    <Box className="flex-1 bg-background">
      <Box className="border-b border-border bg-card p-4">
        <Input>
          <InputField
            value={search}
            onChangeText={setSearch}
            placeholder="Search by specialization..."
          />
        </Input>
      </Box>

      {isLoading ? (
        <Box className="flex-1 items-center justify-center p-6">
          <Spinner />
        </Box>
      ) : isError ? (
        <Box className="flex-1 items-center justify-center p-6">
          <Text className="mb-3 text-[15px] text-danger">Failed to load trainers</Text>
          <Host matchContents>
            <Button label="Retry" onPress={() => refetch()} />
          </Host>
        </Box>
      ) : (
        <FlashList
          data={trainers}
          keyExtractor={keyExtractor}
          renderItem={renderTrainer}
          ItemSeparatorComponent={() => <Box className="h-3" />}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
          ListEmptyComponent={
            <Box className="flex-1 items-center justify-center p-6">
              <Text className="text-[15px] text-text-secondary">No trainers found</Text>
            </Box>
          }
        />
      )}
    </Box>
  );
}
