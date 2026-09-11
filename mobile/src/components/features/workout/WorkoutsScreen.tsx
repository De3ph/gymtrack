import React, { useCallback, useMemo } from "react";
import { RefreshControl, Alert } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useRouter, type Href } from "expo-router";
import { useI18n } from "@/lib/i18n";
import { workoutApi } from "@/api/workoutApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Workout, WorkoutListResponse } from "@/types";
import { canEdit } from "@/lib/canEdit";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Button, Host, RNHostView } from "@expo/ui";
import { Spinner } from "@/components/ui/spinner";
import { PlusIcon } from "@/components/icons";
import { WorkoutCard } from "./WorkoutCard";
import { WorkoutFormModal } from "./WorkoutFormModal";
import { isSessionExpiredError } from "@/api/client";
import { SessionExpiredView } from "@/components/features/auth/SessionExpiredView";
import { useWorkoutFormStore } from "@/stores/workout-form-store";

export function WorkoutsScreen() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const router = useRouter();

  const {
    modalVisible,
    editingWorkout,
    newDate,
    newExercises,
    openCreateModal,
    openEditModal,
    closeModalAndReset,
    setSubmitError,
  } = useWorkoutFormStore();

  const openDetail = useCallback(
    (w: Workout) => {
      if (w.workoutId == null) return;
      router.push(("/workouts/" + String(w.workoutId)) as Href);
    },
    [router],
  );

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useQuery<WorkoutListResponse>({
      queryKey: ["workouts", "list"],
      queryFn: () => workoutApi.getAll() as Promise<WorkoutListResponse>,
    });

  const workouts = useMemo(() => data?.workouts ?? [], [data]);

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => workoutApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts", "list"] });
      closeModalAndReset();
    },
    onError: (err: Error) => {
      setSubmitError(err.message || t("common.errors.generic"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      workoutApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts", "list"] });
      closeModalAndReset();
    },
    onError: (err: Error) => {
      setSubmitError(err.message || t("common.errors.generic"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => workoutApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts", "list"] });
    },
    onError: (err: Error) => {
      Alert.alert(t("common.errors.generic"), err.message);
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleDelete = useCallback(
    (workout: Workout) => {
      const id = workout.workoutId;
      if (id == null) return;
      Alert.alert(
        t("workout.delete_dialog.title"),
        t("workout.delete_dialog.description"),
        [
          { text: t("workout.delete_dialog.cancel"), style: "cancel" },
          {
            text: t("workout.delete_dialog.confirm"),
            style: "destructive",
            onPress: () => deleteMutation.mutate(id),
          },
        ],
      );
    },
    [t, deleteMutation],
  );

  const handleSubmit = useCallback(() => {
    setSubmitError(null);

    if (!newDate.trim()) {
      setSubmitError(t("workout.form.validation.date_required"));
      return;
    }

    const validExercises = newExercises.filter((ex) => ex.name.trim() !== "");
    if (validExercises.length === 0) {
      setSubmitError(t("workout.form.validation.exercises_min_one"));
      return;
    }

    for (const ex of validExercises) {
      if (ex.sets.length === 0) {
        setSubmitError(t("workout.form.validation.sets_min_one"));
        return;
      }
      for (const s of ex.sets) {
        if (!s.reps.trim() || isNaN(Number(s.reps)) || Number(s.reps) < 1) {
          setSubmitError(t("workout.form.validation.reps_min_one"));
          return;
        }
        if (
          s.weight.trim() &&
          (isNaN(Number(s.weight)) || Number(s.weight) < 0)
        ) {
          setSubmitError(t("workout.form.validation.weight_non_negative"));
          return;
        }
      }
    }

    const payload: Record<string, unknown> = {
      date: newDate,
      exercises: validExercises.map((ex) => ({
        exerciseId: ex.pickedExerciseId ?? 0,
        name: ex.name.trim(),
        notes: ex.notes.trim() || undefined,
        sets: ex.sets.map((s) => ({
          weight: s.weight.trim() ? Number(s.weight) : 0,
          weightUnit: "kg",
          reps: Number(s.reps),
        })),
      })),
    };

    if (editingWorkout?.workoutId != null) {
      updateMutation.mutate({ id: editingWorkout.workoutId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }, [
    newDate,
    newExercises,
    editingWorkout,
    t,
    createMutation,
    updateMutation,
    setSubmitError,
  ]);

  const renderItem = useCallback(
    ({ item }: { item: Workout }) => (
      <WorkoutCard
        workout={item}
        editable={canEdit(item.createdAt)}
        onOpen={openDetail}
        onEdit={openEditModal}
        onDelete={handleDelete}
      />
    ),
    [openDetail, openEditModal, handleDelete],
  );

  const keyExtractor = useCallback(
    (item: Workout) => String(item.workoutId ?? item.date),
    [],
  );

  if (isLoading) {
    return (
      <Box className="flex-1 items-center justify-center bg-background p-6">
        <Spinner />
        <Text className="mt-3 text-[15px] text-text-secondary">
          {t("common.loading")}
        </Text>
      </Box>
    );
  }

  if (isError && workouts.length === 0) {
    if (isSessionExpiredError(error)) {
      return <SessionExpiredView message={(error as Error)?.message} />;
    }
    return (
      <Box className="flex-1 items-center justify-center bg-background p-6">
        <Text className="mb-4 text-center text-[15px] text-danger">
          {(error as Error)?.message || t("common.errors.generic")}
        </Text>
        <Host matchContents>
          <Button label={t("common.actions.retry")} onPress={() => refetch()} />
        </Host>
      </Box>
    );
  }

  return (
    <Box className="flex-1 bg-background">
      <FlashList
        data={workouts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={
          workouts.length === 0
            ? { flexGrow: 1, justifyContent: "center", padding: 16 }
            : { padding: 16, paddingBottom: 100 }
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <Box className="items-center py-10">
            <Text className="mb-3 text-5xl">{"\u{1F3CB}"}</Text>
            <Text className="text-center text-base text-text-secondary">
              {t("workout.list.no_workouts")}
            </Text>
          </Box>
        }
      />

      {!modalVisible && (
        <Host
          matchContents
          style={{ position: "absolute", bottom: 24, right: 24 }}
        >
          <Button
            onPress={openCreateModal}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
            }}
          >
            <RNHostView
              style={{
                width: 32,
                height: 32,
              }}
            >
              <PlusIcon
                size={32}
                color="#ffffff"
                style={{ width: 32, lineHeight: 32, textAlign: "center" }}
              />
            </RNHostView>
          </Button>
        </Host>
      )}

      <WorkoutFormModal onSubmit={handleSubmit} isPending={isPending} />
    </Box>
  );
}
