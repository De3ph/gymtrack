import { ScrollView, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workoutPlanApi } from "@/api/workoutPlanApi";
import { useAuthStore } from "@/stores/authStore";
import { AssignClientModal } from "./AssignClientModal";
import { useState } from "react";
import type { WorkoutPlanExercise } from "@/types";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Button, Host } from "@expo/ui";
import { Input, InputField } from "@/components/ui/input";
import { Textarea, TextareaInput } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Center } from "@/components/ui/center";
import { Spinner } from "@/components/ui/spinner";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";

interface PlanDetail {
  planId?: number;
  name?: string;
  description?: string;
  exercises?: { name?: string; sets?: number; reps?: number; weight?: number }[];
}

function flattenExercises(
  exercises: WorkoutPlanExercise[] | undefined
): NonNullable<PlanDetail["exercises"]> {
  return (
    exercises?.map((e) => ({
      name: e.name,
      sets: e.sets?.length,
      reps: e.sets?.[0]?.reps,
      weight: e.sets?.[0]?.weight,
    })) ?? []
  );
}

export function WorkoutPlanDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const isTrainer = user?.role === "trainer";

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editExercises, setEditExercises] = useState<{ name?: string; sets?: number; reps?: number; weight?: number }[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["workoutPlan", id],
    queryFn: () => workoutPlanApi.getById(id!),
    enabled: !!id,
  });

  const { mutate: savePlan, isPending: saving } = useMutation({
    mutationFn: () =>
      workoutPlanApi.update(id!, {
        creatorId: user?.userId ?? 0,
        name: editName,
        description: editDescription,
        exercises: editExercises.map((ex, index) => ({
          exerciseId: 0, // This should be set properly
          name: ex.name || "",
          sets: Array(ex.sets || 0).fill(0).map(() => ({
            setId: "",
            weight: ex.weight || 0,
            weightUnit: "kg",
            reps: ex.reps || 0,
            restTime: 60
          })),
          notes: "",
          order: index
        })),
      }),
    onSuccess: () => {
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["workoutPlan", id] });
      queryClient.invalidateQueries({ queryKey: ["workoutPlans"] });
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to update plan");
    },
  });

  const { mutate: deletePlan, isPending: deleting } = useMutation({
    mutationFn: () => workoutPlanApi.delete(id!),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["workoutPlan", id] });
      queryClient.invalidateQueries({ queryKey: ["workoutPlans"] });
      router.back();
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to delete plan");
    },
  });

  const handleDelete = () => {
    Alert.alert("Delete Plan", "This action cannot be undone. Delete this plan?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deletePlan() },
    ]);
  };

  const handleEdit = () => {
    if (!data) return;
    setEditName(data.name ?? "");
    setEditDescription(data.description ?? "");
    setEditExercises(flattenExercises(data.exercises));
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <Center className="flex-1 bg-background">
        <Spinner size="large" />
      </Center>
    );
  }
  if (isError || !data) {
    return (
      <Center className="flex-1 bg-background">
        <VStack space="md" className="items-center">
          <Text className="text-[15px] text-danger">Failed to load plan</Text>
          <Host matchContents>
            <Button label="Retry" onPress={() => refetch()} />
          </Host>
        </VStack>
      </Center>
    );
  }

  const plan: PlanDetail = {
    planId: data.planId,
    name: data.name,
    description: data.description,
    exercises: flattenExercises(data.exercises)
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-6 pb-12"
    >
      {isEditing ? (
        <VStack space="md">
          <Input>
            <InputField
              value={editName}
              onChangeText={setEditName}
              placeholder="Plan name"
              editable={!saving}
            />
          </Input>
          <Textarea>
            <TextareaInput
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Description (optional)"
              editable={!saving}
            />
          </Textarea>
          <HStack space="sm">
            <Host matchContents>
              <Button
                label="Cancel"
                variant="outlined"
                onPress={handleCancel}
              />
            </Host>
            <Host matchContents>
              <Button
                label="Save"
                onPress={() => savePlan()}
                disabled={saving || !editName.trim()}
              />
            </Host>
          </HStack>
        </VStack>
      ) : (
        <Box className="mb-2">
          <Text className="mb-2 text-2xl font-bold text-text">{plan.name}</Text>
          {plan.description ? (
            <Text className="mb-5 text-sm text-text-secondary">{plan.description}</Text>
          ) : null}
        </Box>
      )}

      {isTrainer && !isEditing && (
        <HStack space="sm" className="mb-4 mt-2">
          <Host matchContents>
            <Button label="Edit" onPress={handleEdit} />
          </Host>
          <Host matchContents>
            <Button
              label="Assign"
              style={{ backgroundColor: "#16a346" }}
              onPress={() => setShowAssignModal(true)}
            />
          </Host>
          <Host matchContents>
            <Button
              label="Delete"
              style={{ backgroundColor: "#dc2626" }}
              onPress={handleDelete}
              disabled={deleting}
            />
          </Host>
        </HStack>
      )}

      <Text className="mb-3 mt-2 text-sm font-bold uppercase tracking-[1px] text-text-secondary">
        Exercises ({plan.exercises?.length ?? 0})
      </Text>
      {(plan.exercises ?? []).map((ex, i) => (
        <Card key={i} className="mb-2 rounded-xl bg-card p-4">
          <Text className="text-[15px] font-semibold text-text">
            {ex.name || `Exercise ${i + 1}`}
          </Text>
          <Text className="mt-1 text-[13px] text-text-secondary">
            {ex.sets} sets × {ex.reps} reps {ex.weight ? `@ ${ex.weight}kg` : ""}
          </Text>
        </Card>
      ))}

      <AssignClientModal
        visible={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        planId={id!}
        onAssigned={() => refetch()}
      />
    </ScrollView>
  );
}
