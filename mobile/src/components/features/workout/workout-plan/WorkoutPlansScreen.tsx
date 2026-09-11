import { useState } from "react";
import { FlatList, RefreshControl, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workoutPlanApi } from "@/api/workoutPlanApi";
import { useAuthStore } from "@/stores/authStore";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Button, Host } from "@expo/ui";
import { Input, InputField } from "@/components/ui/input";
import { Textarea, TextareaInput } from "@/components/ui/textarea";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { Icon, AddIcon, TrashIcon, CloseIcon } from "@/components/ui/icon";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";

interface Plan {
  planId?: number;
  name?: string;
  description?: string;
  exercises?: unknown[];
}

export function WorkoutPlansScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["workoutPlans"],
    queryFn: () => workoutPlanApi.getAll(),
  });

  const { mutate: createPlan, isPending: creating } = useMutation({
    mutationFn: () => workoutPlanApi.create({ creatorId: user?.userId ?? 0, name: newName, description: newDesc, exercises: [] }),
    onSuccess: () => {
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      queryClient.invalidateQueries({ queryKey: ["workoutPlans"] });
    },
  });

  const { mutate: deletePlan } = useMutation({
    mutationFn: (planId: number) => workoutPlanApi.delete(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workoutPlans"] });
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to delete plan");
    },
  });

  const handleDeletePlan = (planId: number) => {
    Alert.alert("Delete Plan", "Delete this workout plan?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deletePlan(planId) },
    ]);
  };

  const plans: Plan[] = (data as { plans?: Plan[] })?.plans ?? [];

  const renderItem = ({ item }: { item: Plan }) => (
    <Pressable
      onPress={() => router.push(`/trainer/plans/${item.planId}`)}
      className="mb-2 rounded-xl border border-border bg-card p-4"
    >
      <HStack className="items-start justify-between">
        <Box className="flex-1">
          <Text className="mb-1 text-base font-bold text-text">{item.name}</Text>
          {item.description ? (
            <Text className="mb-1.5 text-[13px] text-text-secondary" numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          <Text className="text-xs font-semibold text-primary">
            {item.exercises?.length ?? 0} exercises
          </Text>
        </Box>
        {/* RN gesture responder fires inner onPress before parent card onPress,
            so stopPropagation (a DOM API) is unnecessary here. */}
        <Pressable
          onPress={() => { handleDeletePlan(item.planId!); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="pl-3 pt-0.5"
        >
          <Icon as={TrashIcon} className="text-danger" />
        </Pressable>
      </HStack>
    </Pressable>
  );

  return (
    <Box className="flex-1 bg-background">
      {isLoading ? (
        <Box className="flex-1 items-center justify-center p-6">
          <Spinner />
        </Box>
      ) : isError ? (
        <Box className="flex-1 items-center justify-center p-6">
          <Text className="mb-3 text-[15px] text-danger">Failed to load plans</Text>
          <Host matchContents>
            <Button label="Retry" onPress={() => refetch()} />
          </Host>
        </Box>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(item) => String(item.planId ?? "")}
          renderItem={renderItem}
          contentContainerClassName="p-4 pb-20"
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={
            <Box className="flex-1 items-center justify-center p-6">
              <Text className="text-[15px] text-text-secondary">No plans yet</Text>
            </Box>
          }
        />
      )}

      <Pressable
        onPress={() => setShowCreate(true)}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-hard-2"
      >
        <Icon as={AddIcon} size={28} className="text-primary-foreground" />
      </Pressable>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)}>
        <ModalBackdrop />
        <ModalContent className="mb-0 rounded-b-none rounded-t-[20px] p-6 pb-10">
          <ModalHeader className="mb-3.5">
            <Text className="text-xl font-bold text-text">Create Workout Plan</Text>
            <ModalCloseButton>
              <Icon as={CloseIcon} className="text-text-secondary" />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody className="mb-0 mt-0">
            <Input className="mb-3.5">
              <InputField
                value={newName}
                onChangeText={setNewName}
                placeholder="Plan name"
              />
            </Input>
            <Textarea>
              <TextareaInput
                value={newDesc}
                onChangeText={setNewDesc}
                placeholder="Description (optional)"
              />
            </Textarea>
          </ModalBody>
          <ModalFooter className="mt-4 gap-2.5">
            <Host matchContents>
              <Button
                label="Cancel"
                variant="outlined"
                onPress={() => setShowCreate(false)}
              />
            </Host>
            <Host matchContents>
              <Button
                label="Create"
                onPress={() => createPlan()}
                disabled={creating || !newName.trim()}
              />
            </Host>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
