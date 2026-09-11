import React, { useMemo } from "react";
import { Alert, RefreshControl } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { relationshipApi } from "@/api/relationshipApi";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Button, Host } from "@expo/ui";
import { Pressable } from "@/components/ui/pressable";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Spinner } from "@/components/ui/spinner";

interface Client {
  userId?: number;
  username?: string;
  email?: string;
  profile?: { name?: string };
}

export function ClientsScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["clients"],
    queryFn: () => relationshipApi.getMyClients(),
  });

  const clients = useMemo(() => {
    const result = data as { clients?: Client[] };
    return result.clients ?? [];
  }, [data]);

  const { mutate: generateCode, isPending: generating } = useMutation({
    mutationFn: () => relationshipApi.generateInvitation(),
    onSuccess: (res) => {
      const invite = (res as { invitation?: { code?: string; expiresAt?: string } })?.invitation;
      if (invite?.code) {
        Alert.alert("Invitation Code", `Share this code with your athlete:\n\n${invite.code}\n\nExpires: ${invite.expiresAt ?? "7 days"}`, [
          { text: "OK" },
        ]);
      }
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to generate invitation");
    },
  });

  const renderItem = ({ item }: { item: Client }) => (
    <Pressable
      onPress={() => router.push(`/trainer/client/${item.username}`)}
      className="mb-2 flex-row items-center gap-3.5 rounded-xl border border-border bg-card p-3.5"
    >
      <Box className="h-12 w-12 items-center justify-center rounded-full bg-primary">
        <Text className="text-xl font-bold text-primary-foreground">{(item.username ?? "?")[0].toUpperCase()}</Text>
      </Box>
      <VStack>
        <Text className="text-base font-bold text-text">{item.profile?.name || item.username}</Text>
        <Text className="mt-0.5 text-[13px] text-text-secondary">@{item.username}</Text>
      </VStack>
    </Pressable>
  );

  const keyExtractor = (item: Client) => String(item.userId ?? Date.now().toString());

  return (
    <Box className="flex-1 bg-background">
      {isLoading ? (
        <Box className="flex-1 items-center justify-center p-6"><Spinner /></Box>
      ) : isError ? (
        <Box className="flex-1 items-center justify-center p-6">
          <Text className="mb-3 text-[15px] text-danger">Failed to load clients</Text>
          <Host matchContents>
            <Button label="Retry" onPress={() => refetch()} />
          </Host>
        </Box>
      ) : (
        <FlashList
          data={clients}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerClassName="p-4"
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
          ListHeaderComponent={
            <Host matchContents>
              <Button
                label="Generate Invite Code"
                onPress={() => generateCode()}
                disabled={generating}
              />
            </Host>
          }
          ListEmptyComponent={
            <Box className="flex-1 items-center justify-center p-6">
              <Text className="text-[15px] text-text-secondary">No clients yet</Text>
            </Box>
          }
        />
      )}
    </Box>
  );
}
