import { FlatList, RefreshControl } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { coachingRequestApi } from "@/api/coachingRequestApi";
import { useAuthStore } from "@/stores/authStore";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Button, Host } from "@expo/ui";
import { Badge, BadgeText } from "@/components/ui/badge";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Center } from "@/components/ui/center";
import { Spinner } from "@/components/ui/spinner";

interface Request {
  requestId?: number;
  athleteId?: number;
  trainerId?: number;
  athleteUsername?: string;
  trainerUsername?: string;
  message?: string;
  status: string;
  createdAt?: string;
}

const statusBadgeClass: Record<string, string> = {
  accepted: "bg-success-surface",
  rejected: "bg-danger-surface",
  pending: "bg-brand-surface",
  superseded: "bg-muted-surface",
};

const statusTextClass: Record<string, string> = {
  accepted: "text-success-text",
  rejected: "text-danger-text",
  pending: "text-brand-on-light",
  superseded: "text-muted-text",
};

export function CoachingRequestsScreen() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const isTrainer = user?.role === "trainer";

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["coachingRequests", isTrainer],
    queryFn: () => isTrainer ? coachingRequestApi.getPendingRequests() : coachingRequestApi.getMyRequests(),
  });

  const { mutate: accept } = useMutation({
    mutationFn: (id: number) => coachingRequestApi.acceptRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coachingRequests"] }),
  });

  const { mutate: reject } = useMutation({
    mutationFn: (id: number) => coachingRequestApi.rejectRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coachingRequests"] }),
  });

  const requests: Request[] = (data as { requests?: Request[] })?.requests ?? [];

  const renderItem = ({ item }: { item: Request }) => {
    const badgeClass = statusBadgeClass[item.status] ?? "bg-brand-surface";
    const badgeTextClass = statusTextClass[item.status] ?? "text-brand-on-light";
    return (
      <Box className="rounded-xl bg-card p-4 mb-3">
        <HStack className="mb-2 items-center justify-between">
          <Text className="text-base font-bold text-text">{isTrainer ? item.athleteUsername : item.trainerUsername}</Text>
          <Badge className={`rounded-lg px-2.5 py-1 ${badgeClass}`}>
            <BadgeText className={`text-xs font-bold capitalize ${badgeTextClass}`}>{item.status}</BadgeText>
          </Badge>
        </HStack>
        {item.message ? <Text className="text-sm text-text-body">{item.message}</Text> : null}
        {isTrainer && item.status === "pending" && (
          <HStack space="sm" className="mt-3">
            <Host matchContents>
              <Button
                label="Accept"
                onPress={() => item.requestId && accept(item.requestId)}
              />
            </Host>
            <Host matchContents>
              <Button
                label="Reject"
                variant="outlined"
                onPress={() => item.requestId && reject(item.requestId)}
              />
            </Host>
          </HStack>
        )}
      </Box>
    );
  };

  return (
    <Box className="flex-1 bg-background">
      {isLoading ? (
        <Center className="flex-1 p-6">
          <Spinner />
        </Center>
      ) : isError ? (
        <Center className="flex-1 p-6">
          <VStack space="md" className="items-center">
            <Box className="mb-4 rounded border-l-4 border-l-danger bg-danger-surface p-3">
              <Text className="text-sm font-medium text-danger-text">Failed to load requests</Text>
            </Box>
            <Host matchContents>
              <Button label="Retry" onPress={() => refetch()} />
            </Host>
          </VStack>
        </Center>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => String(item.requestId ?? "")}
          renderItem={renderItem}
          contentContainerClassName="p-4"
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
          ListEmptyComponent={
            <Center className="flex-1 p-6">
              <Text className="text-[15px] text-text-secondary">No requests</Text>
            </Center>
          }
        />
      )}
    </Box>
  );
}
