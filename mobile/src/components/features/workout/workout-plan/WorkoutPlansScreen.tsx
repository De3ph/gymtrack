import { useCallback, useState } from "react";
import { Alert, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workoutPlanApi } from "@/api/workoutPlanApi";
import { useI18n } from "@/lib/i18n";
import type { CreateWorkoutPlanRequest, WorkoutPlan } from "@/types";
import { CreateWorkoutPlanModal } from "./CreateWorkoutPlanModal";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Button, Host } from "@expo/ui";
import { Icon, AddIcon, EditIcon, TrashIcon } from "@/components/ui/icon";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";

export function WorkoutPlansScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useI18n();

  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null);
  const [formError, setFormError] = useState("");

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["workoutPlans"],
    queryFn: () => workoutPlanApi.getAll(),
  });

  const savePlan = useMutation({
    mutationFn: ({
      planId,
      payload,
    }: {
      planId?: number;
      payload: CreateWorkoutPlanRequest;
    }) =>
      planId !== undefined
        ? workoutPlanApi.update(planId, payload)
        : workoutPlanApi.create(payload),
    onSuccess: () => {
      setFormOpen(false);
      setEditingPlan(null);
      setFormError("");
      queryClient.invalidateQueries({ queryKey: ["workoutPlans"] });
      queryClient.invalidateQueries({ queryKey: ["workoutPlan"] });
    },
    onError: (err: Error, vars) => {
      setFormError(
        err.message ||
          t(
            vars.planId !== undefined
              ? "trainer.workout_plans.update_failed"
              : "trainer.workout_plans.create_failed"
          )
      );
    },
  });

  const { mutate: deletePlan } = useMutation({
    mutationFn: (planId: number) => workoutPlanApi.delete(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workoutPlans"] });
      queryClient.invalidateQueries({ queryKey: ["workoutPlan"] });
    },
    onError: (err: Error) => {
      Alert.alert(t("trainer.workout_plans.delete"), err.message || t("trainer.workout_plans.delete_failed"));
    },
  });

  const handleDeletePlan = useCallback(
    (plan: WorkoutPlan) => {
      Alert.alert(
        t("trainer.workout_plans.delete"),
        t("trainer.workout_plans.delete_confirm", {
          count: plan.exercises?.length ?? 0,
        }),
        [
          { text: t("common.actions.cancel"), style: "cancel" },
          {
            text: t("trainer.workout_plans.delete"),
            style: "destructive",
            onPress: () => {
              if (plan.planId !== undefined) deletePlan(plan.planId);
            },
          },
        ]
      );
    },
    [t, deletePlan]
  );

  const openCreate = useCallback(() => {
    setFormError("");
    setEditingPlan(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((plan: WorkoutPlan) => {
    setFormError("");
    setEditingPlan(plan);
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingPlan(null);
  }, []);

  const plans: WorkoutPlan[] = data?.plans ?? [];

  const renderItem = ({ item }: { item: WorkoutPlan }) => (
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
            {t("trainer.workout_plans.plan_summary", {
              exercises: item.exercises?.length ?? 0,
              sets: (item.exercises ?? []).reduce((sum, ex) => sum + (ex.sets?.length ?? 0), 0),
            })}
          </Text>
        </Box>
        {/* RN gesture responder fires inner onPress before parent card onPress,
            so stopPropagation (a DOM API) is unnecessary here. */}
        <HStack className="pl-2">
          <CardAction
            icon={EditIcon}
            label={t("trainer.workout_plans.edit")}
            onPress={() => openEdit(item)}
          />
          <CardAction
            icon={TrashIcon}
            label={t("trainer.workout_plans.delete")}
            onPress={() => handleDeletePlan(item)}
          />
        </HStack>
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
          <Text className="mb-3 text-[15px] text-danger">
            {t("trainer.workout_plans.load_failed")}
          </Text>
          <Host matchContents>
            <Button label={t("common.actions.retry")} onPress={() => refetch()} />
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
              <Text className="text-[15px] text-text-secondary">
                {t("trainer.workout_plans.no_plans")}
              </Text>
            </Box>
          }
        />
      )}

      <Pressable
        onPress={openCreate}
        accessibilityRole="button"
        accessibilityLabel={t("trainer.workout_plans.create")}
        testID="workout-plans-fab"
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-hard-2"
      >
        <Icon as={AddIcon} size={28} className="text-primary-foreground" />
      </Pressable>

      <CreateWorkoutPlanModal
        visible={formOpen}
        isPending={savePlan.isPending}
        errorMessage={formError}
        plan={editingPlan}
        onClose={closeForm}
        onSubmit={(payload) => savePlan.mutate({ planId: editingPlan?.planId, payload })}
      />
    </Box>
  );
}

function CardAction({
  icon,
  label,
  onPress,
}: {
  icon: typeof EditIcon;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
      className="px-1.5 pt-0.5"
    >
      <Icon as={icon} size="sm" className="text-text-secondary" />
    </Pressable>
  );
}
