import { useState } from "react";
import { FlatList, RefreshControl, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workoutPlanApi } from "@/api/workoutPlanApi";
import { useAuthStore } from "@/stores/authStore";
import { useI18n } from "@/lib/i18n";
import { ExercisePicker } from "../ExercisePicker";
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
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "@/components/ui/pressable";

interface Plan {
  planId?: number;
  name?: string;
  description?: string;
  exercises?: unknown[];
}

interface NewPlanExercise {
  exerciseId: number;
  name: string;
  sets: number;
  reps: number;
  weight: number;
}

function toNonNegativeNumber(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

export function WorkoutPlansScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { t } = useI18n();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newExercises, setNewExercises] = useState<NewPlanExercise[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [createError, setCreateError] = useState("");

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["workoutPlans"],
    queryFn: () => workoutPlanApi.getAll(),
  });

  const resetCreateForm = () => {
    setNewName("");
    setNewDesc("");
    setNewExercises([]);
    setCreateError("");
  };

  const handleCloseCreate = () => {
    setShowCreate(false);
    resetCreateForm();
  };

  const handlePickerSelect = (exercise: { exerciseId: number; name: string }) => {
    setNewExercises((prev) => [
      ...prev,
      { exerciseId: exercise.exerciseId, name: exercise.name, sets: 3, reps: 10, weight: 0 },
    ]);
    setCreateError("");
  };

  const updateNewExercise = (index: number, patch: Partial<NewPlanExercise>) => {
    setNewExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, ...patch } : ex))
    );
    setCreateError("");
  };

  const removeNewExercise = (index: number) => {
    setNewExercises((prev) => prev.filter((_, i) => i !== index));
    setCreateError("");
  };

  const { mutate: createPlan, isPending: creating } = useMutation({
    mutationFn: () => {
      const trimmedName = newName.trim();
      if (!trimmedName) {
        throw new Error(t("trainer.workout_plans.validation.name_required"));
      }
      if (newExercises.length === 0) {
        throw new Error(t("trainer.workout_plans.validation.exercises_min_one"));
      }
      return workoutPlanApi.create({
        creatorId: user?.userId ?? 0,
        name: trimmedName,
        description: newDesc,
        exercises: newExercises.map((ex, index) => ({
          exerciseId: ex.exerciseId,
          name: ex.name,
          sets: Array.from({ length: Math.max(ex.sets, 1) }, () => ({
            weight: ex.weight,
            weightUnit: "kg",
            reps: ex.reps,
            restTime: 60,
          })),
          notes: "",
          order: index,
        })),
      });
    },
    onSuccess: () => {
      setShowCreate(false);
      resetCreateForm();
      queryClient.invalidateQueries({ queryKey: ["workoutPlans"] });
    },
    onError: (err: Error) => {
      setCreateError(err.message || t("trainer.workout_plans.create_failed"));
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

      <Modal isOpen={showCreate} onClose={handleCloseCreate}>
        <ModalBackdrop />
        <ModalContent className="mb-0 max-h-[90%] rounded-b-none rounded-t-[20px] p-6 pb-10">
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
                onChangeText={(value) => {
                  setNewName(value);
                  setCreateError("");
                }}
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

            <HStack className="mb-2 mt-4 items-center justify-between">
              <Text className="text-sm font-bold text-text">
                {t("trainer.workout_plans.exercises")} ({newExercises.length})
              </Text>
            </HStack>

            {newExercises.map((ex, index) => (
              <Box
                key={`${ex.exerciseId}-${index}`}
                className="mb-2 rounded-xl border border-border bg-card p-3"
              >
                <HStack className="items-center justify-between">
                  <Text
                    className="flex-1 text-[15px] font-semibold text-text"
                    numberOfLines={1}
                  >
                    {ex.name}
                  </Text>
                  <Pressable
                    onPress={() => removeNewExercise(index)}
                    accessibilityRole="button"
                    accessibilityLabel={t("trainer.workout_plans.remove")}
                    hitSlop={8}
                    className="pl-3"
                  >
                    <Icon as={TrashIcon} size="sm" className="text-danger" />
                  </Pressable>
                </HStack>
                <HStack space="sm" className="mt-2">
                  <VStack className="flex-1" space="xs">
                    <Text className="text-xs font-semibold text-text-secondary">
                      {t("trainer.workout_plans.sets_label")}
                    </Text>
                    <Input>
                      <InputField
                        value={String(ex.sets)}
                        onChangeText={(value) =>
                          updateNewExercise(index, {
                            sets: Math.floor(toNonNegativeNumber(value)),
                          })
                        }
                        keyboardType="numeric"
                        editable={!creating}
                      />
                    </Input>
                  </VStack>
                  <VStack className="flex-1" space="xs">
                    <Text className="text-xs font-semibold text-text-secondary">
                      {t("trainer.workout_plans.reps")}
                    </Text>
                    <Input>
                      <InputField
                        value={String(ex.reps)}
                        onChangeText={(value) =>
                          updateNewExercise(index, {
                            reps: Math.floor(toNonNegativeNumber(value)),
                          })
                        }
                        keyboardType="numeric"
                        editable={!creating}
                      />
                    </Input>
                  </VStack>
                  <VStack className="flex-1" space="xs">
                    <Text className="text-xs font-semibold text-text-secondary">
                      {t("trainer.workout_plans.weight")} (kg)
                    </Text>
                    <Input>
                      <InputField
                        value={String(ex.weight)}
                        onChangeText={(value) =>
                          updateNewExercise(index, {
                            weight: toNonNegativeNumber(value),
                          })
                        }
                        keyboardType="decimal-pad"
                        editable={!creating}
                      />
                    </Input>
                  </VStack>
                </HStack>
              </Box>
            ))}

            <Pressable
              onPress={() => setShowExercisePicker(true)}
              accessibilityRole="button"
              accessibilityLabel={t("trainer.workout_plans.add_exercise")}
              disabled={creating}
              className="items-center justify-center rounded-xl border border-dashed border-primary/50 py-3.5 active:bg-primary/5"
            >
              <Text className="text-sm font-semibold text-primary">
                {"+ " + t("trainer.workout_plans.add_exercise")}
              </Text>
            </Pressable>

            {createError ? (
              <Text className="mt-3 text-sm font-medium text-danger">{createError}</Text>
            ) : null}
          </ModalBody>
          <ModalFooter className="mt-4 gap-2.5">
            <Host matchContents>
              <Button
                label="Cancel"
                variant="outlined"
                onPress={handleCloseCreate}
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

      <ExercisePicker
        visible={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
        onSelect={handlePickerSelect}
      />
    </Box>
  );
}
