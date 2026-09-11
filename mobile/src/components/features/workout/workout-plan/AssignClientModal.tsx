import { FlatList, Alert } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { relationshipApi } from "@/api/relationshipApi";
import { workoutPlanApi } from "@/api/workoutPlanApi";
import { useState, useMemo } from "react";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Button, Checkbox, Host } from "@expo/ui";
import { CloseIcon, Icon } from "@/components/ui/icon";
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { VStack } from "@/components/ui/vstack";

interface Athlete {
  userId?: number;
  email?: string;
  username?: string;
  profile?: { name?: string; avatar?: string };
}

interface ClientItem {
  relationship: { relationshipId?: number; athleteId?: number; trainerId?: number; status?: string };
  athlete: Athlete;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  planId: string | number;
  onAssigned: () => void;
}

export function AssignClientModal({ visible, onClose, planId, onAssigned }: Props) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["myClients"],
    queryFn: () => relationshipApi.getMyClients(),
    enabled: visible,
  });

  const { mutate: assignPlan, isPending: assigning } = useMutation({
    mutationFn: (athleteId: number) =>
      workoutPlanApi.assign(planId, { athleteId }),
    onSuccess: () => {
      Alert.alert("Assigned", "Workout plan assigned successfully");
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["workoutPlan", planId] });
      onAssigned();
      onClose();
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to assign plan");
    },
  });

  const clients: ClientItem[] = useMemo(() => {
    return data?.clients?.map(client => ({
      relationship: {
        relationshipId: client.relationshipId,
        athleteId: client.athleteId,
        trainerId: client.trainerId,
        status: client.status
      },
      athlete: {
        athleteId: client.athleteId,
        name: `Athlete ${client.athleteId}`,
        username: `athlete${client.athleteId}`
      }
    })) ?? [];
  }, [data]);

  const toggleClient = (athleteId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(athleteId)) next.delete(athleteId);
      else next.add(athleteId);
      return next;
    });
  };

  const handleAssign = () => {
    if (selectedIds.size === 0) {
      Alert.alert("Select", "Select at least one athlete");
      return;
    }
    Array.from(selectedIds).forEach(athleteId => {
      assignPlan(athleteId);
    });
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    onClose();
  };

  const renderItem = ({ item }: { item: ClientItem }) => {
    const athlete = item.athlete;
    const athleteId = athlete.userId ?? item.relationship.athleteId ?? 0;
    const isSelected = selectedIds.has(athleteId);
    const name = athlete.profile?.name || athlete.username || athlete.email || "Unknown";
    const subtitle = athlete.email || athlete.username || "";

    return (
      <Box
        className={
          isSelected
            ? "rounded-[10px] border-[1.5px] border-primary bg-primary-surface p-3.5"
            : "rounded-[10px] border-[1.5px] border-transparent bg-background p-3.5"
        }
      >
        <Host matchContents>
          <Checkbox
            value={isSelected}
            onValueChange={() => toggleClient(athleteId)}
            label={name}
          />
        </Host>
        {subtitle ? (
          <Text className="ml-6 mt-1 text-[13px] text-text-secondary">{subtitle}</Text>
        ) : null}
      </Box>
    );
  };

  const showAssign = !isLoading && !isError && clients.length > 0;

  return (
    <Modal isOpen={visible} onClose={handleClose} size="md">
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Text className="text-lg font-bold text-text">Assign to Athletes</Text>
          <ModalCloseButton>
            <Icon as={CloseIcon} className="h-5 w-5 text-text-secondary" />
          </ModalCloseButton>
        </ModalHeader>

        <ModalBody>
          {isLoading ? (
            <Box className="items-center py-8">
              <Spinner />
            </Box>
          ) : isError ? (
            <Box className="items-center py-8">
              <Box className="mb-3 w-full rounded border-l-4 border-l-danger bg-danger-surface p-3">
                <Text className="text-sm font-medium text-danger-text">
                  Failed to load clients
                </Text>
              </Box>
              <Host matchContents>
                <Button label="Retry" onPress={() => refetch()} />
              </Host>
            </Box>
          ) : clients.length === 0 ? (
            <Box className="items-center py-8">
              <Text className="text-sm text-text-secondary">No active clients</Text>
            </Box>
          ) : (
            <VStack space="sm">
              <FlatList
                data={clients}
                keyExtractor={(item, index) => String(item.relationship?.relationshipId ?? item.athlete?.userId ?? index)}
                renderItem={renderItem}
                contentContainerStyle={{ gap: 8 }}
              />
            </VStack>
          )}
        </ModalBody>

        <ModalFooter>
          <Host matchContents>
            <Button label="Cancel" variant="outlined" onPress={handleClose} />
          </Host>
          {showAssign ? (
            <Host matchContents>
              <Button
                label={`Assign (${selectedIds.size})`}
                onPress={handleAssign}
                disabled={selectedIds.size === 0 || assigning}
              />
            </Host>
          ) : null}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
