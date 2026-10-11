import { useCallback, useState } from "react";
import { ScrollView, Alert, RefreshControl } from "react-native";
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

/** The backend rejects athlete plan creation past three (PLAN_LIMIT_REACHED). */
const PLAN_LIMIT = 3;

export function AthleteWorkoutPlansScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useI18n();

  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null);
  const [formError, setFormError] = useState("");

  // Own plans and trainer-assigned plans come from different endpoints, so
  // each section loads, fails, and empties independently — like the web page.
  const {
    data: ownData,
    isLoading: ownLoading,
    isError: ownError,
    refetch: refetchOwn,
  } = useQuery({
    queryKey: ["workoutPlans"],
    queryFn: () => workoutPlanApi.getAll(),
  });
  const {
    data: assignedData,
    isLoading: assignedLoading,
    isError: assignedError,
    refetch: refetchAssigned,
  } = useQuery({
    queryKey: ["myPlans"],
    queryFn: () => workoutPlanApi.getMyPlans(),
  });

  const ownPlans: WorkoutPlan[] = ownData?.plans ?? [];
  const assignedPlans: WorkoutPlan[] = assignedData?.plans ?? [];
  const limitReached = ownPlans.length >= PLAN_LIMIT;

  // Deleting an own plan that a trainer assigned also removes it from the
  // assigned list, so both lists (and any open detail) refresh after a write.
  const refreshPlanLists = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["workoutPlans"] });
    queryClient.invalidateQueries({ queryKey: ["myPlans"] });
    queryClient.invalidateQueries({ queryKey: ["workoutPlan"] });
  }, [queryClient]);

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
      refreshPlanLists();
    },
    onError: (err: Error, vars) => {
      setFormError(
        err.message ||
          t(
            vars.planId !== undefined
              ? "athlete.workout_plans.update_failed"
              : "athlete.workout_plans.create_failed"
          )
      );
    },
  });

  const { mutate: deletePlan } = useMutation({
    mutationFn: (planId: number) => workoutPlanApi.delete(planId),
    onSuccess: refreshPlanLists,
    onError: (err: Error) => {
      Alert.alert(
        t("athlete.workout_plans.delete"),
        err.message || t("athlete.workout_plans.delete_failed")
      );
    },
  });

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

  const confirmDelete = useCallback(
    (plan: WorkoutPlan) => {
      Alert.alert(
        t("athlete.workout_plans.delete"),
        t("athlete.workout_plans.delete_confirm", {
          count: plan.exercises?.length ?? 0,
        }),
        [
          { text: t("common.actions.cancel"), style: "cancel" },
          {
            text: t("athlete.workout_plans.delete"),
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

  const openDetail = useCallback(
    (plan: WorkoutPlan) => {
      if (plan.planId !== undefined) router.push(`/trainer/plans/${plan.planId}`);
    },
    [router]
  );

  const renderOwnCard = (plan: WorkoutPlan) => (
    <PlanCard
      key={String(plan.planId ?? plan.name)}
      plan={plan}
      onPress={openDetail}
      onEdit={openEdit}
      onDelete={confirmDelete}
    />
  );

  const renderAssignedCard = (plan: WorkoutPlan) => (
    <PlanCard key={String(plan.planId ?? plan.name)} plan={plan} onPress={openDetail} />
  );

  return (
    <Box className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="gap-6 p-4 pb-24"
        refreshControl={
          <RefreshControl
            refreshing={ownLoading || assignedLoading}
            onRefresh={() => {
              void refetchOwn();
              void refetchAssigned();
            }}
          />
        }
      >
        {/* My Plans — created by the athlete, capped at PLAN_LIMIT */}
        <Box className="gap-3">
          <HStack className="items-center justify-between">
            <HStack className="items-baseline gap-2">
              <Text className="text-lg font-bold text-text">
                {t("athlete.workout_plans.own_plans")}
              </Text>
              <Text className="text-xs font-semibold text-text-tertiary">
                {t("athlete.workout_plans.limit_counter", { count: ownPlans.length })}
              </Text>
            </HStack>
          </HStack>

          {limitReached ? (
            <Text className="text-[13px] text-text-secondary">
              {t("athlete.workout_plans.limit_reached")}
            </Text>
          ) : null}

          {ownLoading ? (
            <SectionSpinner />
          ) : ownError ? (
            <SectionError
              message={t("athlete.workout_plans.load_failed")}
              onRetry={() => void refetchOwn()}
            />
          ) : ownPlans.length === 0 ? (
            <Text className="text-[15px] text-text-secondary">
              {t("athlete.workout_plans.no_plans")}
            </Text>
          ) : (
            ownPlans.map(renderOwnCard)
          )}
        </Box>

        {/* Assigned by Trainer — read-only */}
        <Box className="gap-3">
          <Text className="text-lg font-bold text-text">
            {t("athlete.workout_plans.assigned_plans")}
          </Text>

          {assignedLoading ? (
            <SectionSpinner />
          ) : assignedError ? (
            <SectionError
              message={t("athlete.workout_plans.load_failed")}
              onRetry={() => void refetchAssigned()}
            />
          ) : assignedPlans.length === 0 ? (
            <Text className="text-[15px] text-text-secondary">
              {t("athlete.workout_plans.empty")}
            </Text>
          ) : (
            assignedPlans.map(renderAssignedCard)
          )}
        </Box>
      </ScrollView>

      {!limitReached ? (
        <Pressable
          onPress={openCreate}
          accessibilityRole="button"
          accessibilityLabel={t("athlete.workout_plans.create")}
          testID="workout-plans-fab"
          className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-hard-2"
        >
          <Icon as={AddIcon} size={28} className="text-primary-foreground" />
        </Pressable>
      ) : null}

      <CreateWorkoutPlanModal
        visible={formOpen}
        isPending={savePlan.isPending}
        errorMessage={formError}
        namespace="athlete.workout_plans"
        plan={editingPlan}
        onClose={closeForm}
        onSubmit={(payload) => savePlan.mutate({ planId: editingPlan?.planId, payload })}
      />
    </Box>
  );
}

function SectionSpinner() {
  return (
    <Box className="items-center py-8">
      <Spinner />
    </Box>
  );
}

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <Box className="items-center py-6">
      <Text className="mb-3 text-[15px] text-danger">{message}</Text>
      <Host matchContents>
        <Button label={t("common.actions.retry")} onPress={onRetry} />
      </Host>
    </Box>
  );
}

interface PlanCardProps {
  plan: WorkoutPlan;
  onPress: (plan: WorkoutPlan) => void;
  /** Present on owned plans only — assigned plans are read-only. */
  onEdit?: (plan: WorkoutPlan) => void;
  onDelete?: (plan: WorkoutPlan) => void;
}

function PlanCard({ plan, onPress, onEdit, onDelete }: PlanCardProps) {
  const { t } = useI18n();

  return (
    <Pressable
      onPress={() => onPress(plan)}
      className="rounded-xl border border-border bg-card p-4"
    >
      <HStack className="items-start justify-between">
        <Box className="flex-1">
          <Text className="mb-1 text-base font-bold text-text">{plan.name}</Text>
          {plan.description ? (
            <Text className="mb-1.5 text-[13px] text-text-secondary" numberOfLines={2}>
              {plan.description}
            </Text>
          ) : null}
          <Text className="text-xs font-semibold text-primary">
            {t("athlete.workout_plans.plan_summary", {
              exercises: plan.exercises?.length ?? 0,
              sets: (plan.exercises ?? []).reduce(
                (sum, ex) => sum + (ex.sets?.length ?? 0),
                0
              ),
            })}
          </Text>
        </Box>
        {onEdit || onDelete ? (
          <HStack className="pl-2">
            {onEdit ? (
              <CardAction
                icon={EditIcon}
                label={t("athlete.workout_plans.edit")}
                onPress={() => onEdit(plan)}
              />
            ) : null}
            {onDelete ? (
              <CardAction
                icon={TrashIcon}
                label={t("athlete.workout_plans.delete")}
                onPress={() => onDelete(plan)}
              />
            ) : null}
          </HStack>
        ) : null}
      </HStack>
    </Pressable>
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
