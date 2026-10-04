import React, { useCallback, useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Host } from "@expo/ui";

import { useI18n } from "@/lib/i18n";
import { parseDateString } from "@/lib/dates";
import { workoutApi } from "@/api/workoutApi";
import {
  useWorkoutFormStore,
  type NewExercise,
  type NewSet,
} from "@/stores/workout-form-store";
import { DateField } from "@/components/features/common/DateField";
import { ExercisePicker } from "./ExercisePicker";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "@/components/ui/pressable";
import { Input, InputField, InputSlot } from "@/components/ui/input";
import {
  Icon,
  CheckIcon,
  CloseIcon,
  SearchIcon,
  TrashIcon,
} from "@/components/ui/icon";
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@/components/ui/alert-dialog";

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return (
    String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0")
  );
}

interface SetRowProps {
  exId: string;
  set: NewSet;
  index: number;
  previous: string | null;
  completed: boolean;
  canRemove: boolean;
  weightPlaceholder: string;
  repsPlaceholder: string;
  toggleLabel: string;
  removeLabel: string;
  onToggle: (setId: string) => void;
  onRemove: (exId: string, setId: string) => void;
  onUpdateWeight: (exId: string, setId: string, weight: string) => void;
  onUpdateReps: (exId: string, setId: string, reps: string) => void;
}

const SetRow = React.memo(function SetRow({
  exId,
  set,
  index,
  previous,
  completed,
  canRemove,
  weightPlaceholder,
  repsPlaceholder,
  toggleLabel,
  removeLabel,
  onToggle,
  onRemove,
  onUpdateWeight,
  onUpdateReps,
}: SetRowProps) {
  return (
    <HStack
      space="sm"
      className={
        "items-center rounded-xl px-1 py-1 " +
        (completed ? "bg-success-surface" : "")
      }
    >
      <Pressable
        onPress={() => {
          if (canRemove) onRemove(exId, set.id);
        }}
        disabled={!canRemove}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={removeLabel}
        accessibilityHint={canRemove ? undefined : ""}
        className="h-11 w-10 items-center justify-center rounded-lg bg-surface-subtle active:opacity-70"
      >
        <Text className="text-[13px] font-semibold text-text-secondary">
          {String(index + 1)}
        </Text>
      </Pressable>

      <Text
        className="flex-1 text-[13px] text-text-tertiary"
        numberOfLines={1}
      >
        {previous ?? "—"}
      </Text>

      <Input className="h-11 w-[72px] rounded-xl">
        <InputField
          value={set.weight}
          onChangeText={(v: string) => onUpdateWeight(exId, set.id, v)}
          placeholder={weightPlaceholder}
          accessibilityLabel={weightPlaceholder + " " + String(index + 1)}
          keyboardType="numeric"
          style={{ textAlign: "center" }}
        />
      </Input>

      <Input className="h-11 w-[72px] rounded-xl">
        <InputField
          value={set.reps}
          onChangeText={(v: string) => onUpdateReps(exId, set.id, v)}
          placeholder={repsPlaceholder}
          accessibilityLabel={repsPlaceholder + " " + String(index + 1)}
          keyboardType="numeric"
          style={{ textAlign: "center" }}
        />
      </Input>

      <Pressable
        onPress={() => onToggle(set.id)}
        hitSlop={4}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed }}
        accessibilityLabel={toggleLabel}
        className={
          "h-11 w-11 items-center justify-center rounded-full border active:opacity-70 " +
          (completed ? "border-success bg-success-surface" : "border-border")
        }
      >
        <Icon
          as={CheckIcon}
          size="md"
          className={completed ? "text-success" : "text-text-tertiary"}
        />
      </Pressable>
    </HStack>
  );
});

interface ExerciseSectionProps {
  exercise: NewExercise;
  index: number;
  previousSets: string[];
  completedSets: Record<string, boolean>;
  namePlaceholder: string;
  notesPlaceholder: string;
  weightPlaceholder: string;
  repsPlaceholder: string;
  emptyPrevious: string;
  columnSet: string;
  columnPrevious: string;
  columnKg: string;
  columnReps: string;
  addSetLabel: string;
  browseLabel: string;
  removeExerciseLabel: string;
  changeExerciseLabel: string;
  toggleSetLabel: (n: number) => string;
  untoggleSetLabel: (n: number) => string;
  removeSetLabel: (n: number) => string;
  onRemoveExercise: (exId: string) => void;
  onUpdateName: (exId: string, name: string) => void;
  onUpdateNotes: (exId: string, notes: string) => void;
  onOpenPicker: (exId: string) => void;
  onAddSet: (exId: string) => void;
  onRemoveSet: (exId: string, setId: string) => void;
  onToggleSet: (setId: string) => void;
  onUpdateSetWeight: (exId: string, setId: string, weight: string) => void;
  onUpdateSetReps: (exId: string, setId: string, reps: string) => void;
}

const ExerciseSection = React.memo(function ExerciseSection({
  exercise,
  index,
  previousSets,
  completedSets,
  namePlaceholder,
  notesPlaceholder,
  weightPlaceholder,
  repsPlaceholder,
  emptyPrevious,
  columnSet,
  columnPrevious,
  columnKg,
  columnReps,
  addSetLabel,
  browseLabel,
  removeExerciseLabel,
  changeExerciseLabel,
  toggleSetLabel,
  untoggleSetLabel,
  removeSetLabel,
  onRemoveExercise,
  onUpdateName,
  onUpdateNotes,
  onOpenPicker,
  onAddSet,
  onRemoveSet,
  onToggleSet,
  onUpdateSetWeight,
  onUpdateSetReps,
}: ExerciseSectionProps) {
  return (
    <Box className="rounded-2xl border border-border bg-card p-4">
      <HStack className="items-center gap-2">
        <Input className="h-12 flex-1 rounded-xl border-0 bg-transparent">
          <InputField
            value={exercise.name}
            onChangeText={(v: string) => onUpdateName(exercise.id, v)}
            placeholder={namePlaceholder + " " + String(index + 1)}
            accessibilityLabel={namePlaceholder + " " + String(index + 1)}
            autoCapitalize="words"
            returnKeyType="done"
            className="text-[17px] font-semibold text-primary"
          />
          <InputSlot className="pr-2">
            <Pressable
              onPress={() => onOpenPicker(exercise.id)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={changeExerciseLabel + ": " + browseLabel}
              className="h-11 w-11 items-center justify-center active:opacity-70"
            >
              <Icon as={SearchIcon} size="md" className="text-primary" />
            </Pressable>
          </InputSlot>
        </Input>
        <Pressable
          onPress={() => onRemoveExercise(exercise.id)}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={removeExerciseLabel}
          className="h-11 w-11 items-center justify-center rounded-xl active:bg-surface-subtle"
        >
          <Icon as={TrashIcon} size="md" className="text-danger" />
        </Pressable>
      </HStack>

      <Input className="mt-2 min-h-[44px] rounded-xl">
        <InputField
          value={exercise.notes}
          onChangeText={(v: string) => onUpdateNotes(exercise.id, v)}
          placeholder={notesPlaceholder}
          multiline
        />
      </Input>

      <HStack space="sm" className="mb-1 mt-3 items-center px-1">
        <Text className="w-10 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
          {columnSet}
        </Text>
        <Text
          className="flex-1 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary"
          numberOfLines={1}
        >
          {columnPrevious}
        </Text>
        <Text className="w-[72px] text-center text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
          {columnKg}
        </Text>
        <Text className="w-[72px] text-center text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
          {columnReps}
        </Text>
        <Box className="w-11" />
      </HStack>

      <VStack space="xs">
        {exercise.sets.map((s, sIdx) => {
          const done = completedSets[s.id] === true;
          return (
            <SetRow
              key={s.id}
              exId={exercise.id}
              set={s}
              index={sIdx}
              previous={previousSets[sIdx] ?? emptyPrevious}
              completed={done}
              canRemove={exercise.sets.length > 1}
              weightPlaceholder={weightPlaceholder}
              repsPlaceholder={repsPlaceholder}
              toggleLabel={
                done ? untoggleSetLabel(sIdx + 1) : toggleSetLabel(sIdx + 1)
              }
              removeLabel={removeSetLabel(sIdx + 1)}
              onToggle={onToggleSet}
              onRemove={onRemoveSet}
              onUpdateWeight={onUpdateSetWeight}
              onUpdateReps={onUpdateSetReps}
            />
          );
        })}
      </VStack>

      <Pressable
        onPress={() => onAddSet(exercise.id)}
        accessibilityRole="button"
        accessibilityLabel={addSetLabel}
        className="mt-2 min-h-[44px] items-center justify-center rounded-xl active:bg-surface-subtle"
      >
        <Text className="text-[15px] font-semibold text-primary">
          {"+ " + addSetLabel}
        </Text>
      </Pressable>
    </Box>
  );
});

export function ActiveWorkoutScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const {
    editingWorkout,
    newDate,
    newExercises,
    submitError,
    pickerVisible,
    pickingForExId,
    setNewDate,
    setSubmitError,
    openPickerFor,
    setPickerVisible,
    handleExerciseSelect,
    updateExerciseName,
    updateExerciseNotes,
    addPickedExercise,
    removeExercise,
    addSet,
    removeSet,
    updateSetReps,
    updateSetWeight,
    resetForm,
  } = useWorkoutFormStore();

  const [elapsed, setElapsed] = useState(0);
  const [completedSets, setCompletedSets] = useState<Record<string, boolean>>(
    {},
  );
  const [discardOpen, setDiscardOpen] = useState(false);
  const [addMode, setAddMode] = useState(false);

  useEffect(() => {
    const startedAt = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const isEdit = editingWorkout !== null;
  const title = isEdit
    ? t("workout.edit_dialog.title")
    : t("workout.form.title");

  const previousByExercise = useMemo<string[][]>(() => {
    if (!editingWorkout) return [];
    return (editingWorkout.exercises ?? []).map((ex) =>
      (ex.sets ?? []).map(
        (s) => String(s.weight ?? 0) + " kg × " + String(s.reps ?? 0),
      ),
    );
  }, [editingWorkout]);

  const hasContent = useMemo(
    () =>
      newExercises.some(
        (ex) =>
          ex.name.trim() !== "" ||
          ex.notes.trim() !== "" ||
          ex.sets.some((s) => s.reps.trim() !== "" || s.weight.trim() !== ""),
      ),
    [newExercises],
  );

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/workouts");
    }
  }, [router]);

  const handleClose = useCallback(() => {
    if (hasContent) {
      setDiscardOpen(true);
    } else {
      resetForm();
      goBack();
    }
  }, [hasContent, resetForm, goBack]);

  const confirmDiscard = useCallback(() => {
    setDiscardOpen(false);
    resetForm();
    goBack();
  }, [resetForm, goBack]);

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => workoutApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts", "list"] });
      setCompletedSets({});
      resetForm();
      goBack();
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
      setCompletedSets({});
      resetForm();
      goBack();
    },
    onError: (err: Error) => {
      setSubmitError(err.message || t("common.errors.generic"));
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleFinish = useCallback(() => {
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

    const parsedDate = parseDateString(newDate);
    const payload: Record<string, unknown> = {
      date: parsedDate ? parsedDate.toISOString() : newDate,
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

  const toggleSet = useCallback((setId: string) => {
    setCompletedSets((prev) => ({ ...prev, [setId]: !(prev[setId] === true) }));
  }, []);

  const openAddExercises = useCallback(() => {
    setAddMode(true);
    setPickerVisible(true);
  }, [setPickerVisible]);

  const closePicker = useCallback(() => {
    setAddMode(false);
    setPickerVisible(false);
  }, [setPickerVisible]);

  const handlePickerSelect = useCallback(
    (exercise: { name: string; exerciseId: number; category?: string }) => {
      if (addMode || !pickingForExId) {
        addPickedExercise(exercise.name, exercise.exerciseId);
      } else {
        handleExerciseSelect(exercise);
      }
    },
    [addMode, pickingForExId, addPickedExercise, handleExerciseSelect],
  );

  const namePlaceholder = t("workout.form.exercise.name.label");
  const notesPlaceholder = t("workout.form.exercise.notes");
  const weightPlaceholder = t("workout.form.exercise.sets.weight");
  const repsPlaceholder = t("workout.form.exercise.sets.reps");
  const emptyPrevious = t("workout.log.previous_empty");
  const finishLabel = isPending ? t("workout.log.finishing") : t("workout.log.finish");

  return (
    <Box className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <HStack
          className="items-center gap-2 border-b border-border bg-background px-4 py-2"
          style={{ paddingTop: insets.top + 8 }}
        >
          <Pressable
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel={t("workout.log.close")}
            className="h-11 w-11 items-center justify-center rounded-full active:bg-surface-subtle"
          >
            <Icon as={CloseIcon} size="md" className="text-text" />
          </Pressable>

          <Box
            accessibilityRole="text"
            accessibilityLabel={
              t("workout.log.timer_label") + ": " + formatElapsed(elapsed)
            }
            className="min-h-[36px] items-center justify-center rounded-full bg-surface-subtle px-3"
          >
            <Text className="text-[15px] font-semibold tabular-nums text-text-secondary">
              {formatElapsed(elapsed)}
            </Text>
          </Box>

          <Box className="flex-1" />

          <Pressable
            onPress={handleFinish}
            disabled={isPending}
            accessibilityRole="button"
            accessibilityLabel={finishLabel}
            className={
              "min-h-[44px] items-center justify-center rounded-xl bg-primary px-5 active:opacity-80 " +
              (isPending ? "opacity-50" : "")
            }
          >
            <Text className="text-[16px] font-bold text-primary-foreground">
              {finishLabel}
            </Text>
          </Pressable>
        </HStack>

        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 32 + insets.bottom,
            gap: 16,
          }}
        >
          <VStack space="xs">
            <Text className="text-[24px] font-bold text-text">{title}</Text>
            <Box className="mt-2">
              <Text className="mb-1.5 text-sm font-semibold text-text">
                {t("workout.form.date.label")}
              </Text>
              <DateField
                value={newDate}
                onChange={setNewDate}
                disabled={isEdit}
              />
            </Box>
          </VStack>

          {newExercises.map((ex, exIdx) => (
            <ExerciseSection
              key={ex.id}
              exercise={ex}
              index={exIdx}
              previousSets={previousByExercise[exIdx] ?? []}
              completedSets={completedSets}
              namePlaceholder={namePlaceholder}
              notesPlaceholder={notesPlaceholder}
              weightPlaceholder={weightPlaceholder}
              repsPlaceholder={repsPlaceholder}
              emptyPrevious={emptyPrevious}
              columnSet={t("workout.log.column_set")}
              columnPrevious={t("workout.log.column_previous")}
              columnKg={t("workout.log.column_kg")}
              columnReps={t("workout.log.column_reps")}
              addSetLabel={t("workout.log.add_set")}
              browseLabel={t("workout.form.exercise.browse")}
              removeExerciseLabel={t("workout.log.remove_exercise")}
              changeExerciseLabel={t("workout.log.change_exercise")}
              toggleSetLabel={(n) => t("workout.log.toggle_set", { number: n })}
              untoggleSetLabel={(n) =>
                t("workout.log.untoggle_set", { number: n })
              }
              removeSetLabel={(n) => t("workout.log.remove_set", { number: n })}
              onRemoveExercise={removeExercise}
              onUpdateName={updateExerciseName}
              onUpdateNotes={updateExerciseNotes}
              onOpenPicker={openPickerFor}
              onAddSet={addSet}
              onRemoveSet={removeSet}
              onToggleSet={toggleSet}
              onUpdateSetWeight={updateSetWeight}
              onUpdateSetReps={updateSetReps}
            />
          ))}

          <Pressable
            onPress={openAddExercises}
            accessibilityRole="button"
            accessibilityLabel={t("workout.log.add_exercises")}
            className="min-h-[52px] items-center justify-center rounded-2xl bg-brand-surface active:opacity-80"
          >
            <Text className="text-[16px] font-semibold text-brand-on-light">
              {"+ " + t("workout.log.add_exercises")}
            </Text>
          </Pressable>

          {submitError ? (
            <Box className="rounded border-l-4 border-l-danger bg-danger-surface p-3">
              <Text className="text-sm font-medium text-danger-text">
                {submitError}
              </Text>
            </Box>
          ) : null}

          {!isEdit && (
            <Pressable
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel={t("workout.log.cancel_workout")}
              className="mb-2 min-h-[52px] items-center justify-center rounded-2xl bg-danger-surface active:opacity-80"
            >
              <Text className="text-[16px] font-semibold text-danger-text">
                {t("workout.log.cancel_workout")}
              </Text>
            </Pressable>
          )}
        </ScrollView>

        <ExercisePicker
          visible={pickerVisible}
          onClose={closePicker}
          onSelect={handlePickerSelect}
        />

        <AlertDialog
          isOpen={discardOpen}
          onClose={() => setDiscardOpen(false)}
        >
          <AlertDialogBackdrop />
          <AlertDialogContent>
            <AlertDialogHeader>
              <Text className="text-lg font-bold text-text">
                {t("workout.log.discard_title")}
              </Text>
            </AlertDialogHeader>
            <AlertDialogBody>
              <Text className="mt-2 text-sm text-text-secondary">
                {t("workout.log.discard_message")}
              </Text>
            </AlertDialogBody>
            <AlertDialogFooter className="mt-4">
              <Host matchContents>
                <Button
                  label={t("workout.log.discard_keep")}
                  variant="outlined"
                  onPress={() => setDiscardOpen(false)}
                />
              </Host>
              <Host matchContents>
                <Button
                  label={t("workout.log.discard_confirm")}
                  onPress={confirmDiscard}
                />
              </Host>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </KeyboardAvoidingView>
    </Box>
  );
}
