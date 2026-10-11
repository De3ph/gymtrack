import { useCallback, useState } from "react";
import { Keyboard, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Host } from "@expo/ui";
import { useI18n } from "@/lib/i18n";
import { triggerHaptic } from "@/lib/haptics";
import { parseNumeric } from "@/lib/numbers";
import type {
  CreateWorkoutPlanRequest,
  WorkoutPlan,
  WorkoutPlanExercise,
  WorkoutPlanSet,
} from "@/types";
import { ExerciseCatalogContent, type PickedExercise } from "../ExercisePicker";
import {
  PlanSetEditor,
  createPlanSetDraft,
  toPlanSetPayload,
  type PlanSetDraft,
  type WorkoutPlanFormNamespace,
} from "./PlanSetEditor";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Input, InputField } from "@/components/ui/input";
import { Textarea, TextareaInput } from "@/components/ui/textarea";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "@/components/ui/pressable";
import { Icon, AddIcon, AlertCircleIcon, CloseIcon, TrashIcon } from "@/components/ui/icon";
import {
  Modal,
  ModalBackdrop,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";

const SECTION_LABEL = "text-[11px] font-bold uppercase tracking-[1px] text-text-tertiary";
const FIELD_LABEL = "mb-1 text-[13px] font-semibold text-text-body";

interface PlanExerciseDraft {
  /** Stable identity: an exercise without a catalog pick has no id yet. */
  key: string;
  exerciseId: number;
  name: string;
  sets: PlanSetDraft[];
  notes: string;
}

interface ExerciseErrors {
  exercise?: string;
  sets?: string;
}

interface FormErrors {
  name?: string;
  exercises?: string;
  /** Keyed by `PlanExerciseDraft.key`. */
  byExercise: Record<string, ExerciseErrors>;
}

const EMPTY_ERRORS: FormErrors = { byExercise: {} };

let nextExerciseKey = 0;

function createExerciseDraft(
  seed?: {
    exerciseId: number;
    name: string;
    sets?: PlanSetDraft[];
    notes?: string;
  }
): PlanExerciseDraft {
  nextExerciseKey += 1;
  return {
    key: `ex-${nextExerciseKey}`,
    exerciseId: seed?.exerciseId ?? 0,
    name: seed?.name ?? "",
    sets: seed?.sets?.length ? seed.sets : [createPlanSetDraft()],
    notes: seed?.notes ?? "",
  };
}

/** Saved sets come back as numbers; the editor edits them as raw strings. */
function planSetToDraft(set: WorkoutPlanSet): PlanSetDraft {
  // createPlanSetDraft supplies a unique list key from the shared counter.
  return {
    ...createPlanSetDraft(),
    weight: String(set.weight ?? 0),
    weightUnit: set.weightUnit ?? "kg",
    reps: String(set.reps ?? ""),
    restTime: String(set.restTime ?? ""),
  };
}

interface CreateWorkoutPlanModalProps {
  visible: boolean;
  isPending?: boolean;
  /** Message from the caller's mutation, rendered as a banner. */
  errorMessage?: string;
  /** Message namespace for labels — mirrors the web form dialog's role copy. */
  namespace?: WorkoutPlanFormNamespace;
  /** Present → the sheet edits this plan instead of creating a new one. */
  plan?: WorkoutPlan | null;
  onClose: () => void;
  onSubmit: (payload: CreateWorkoutPlanRequest) => void;
}

export function CreateWorkoutPlanModal({
  visible,
  isPending = false,
  errorMessage,
  namespace = "trainer.workout_plans",
  plan = null,
  onClose,
  onSubmit,
}: CreateWorkoutPlanModalProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  const tt = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      t(`${namespace}.${key}`, params),
    [t, namespace]
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [exercises, setExercises] = useState<PlanExerciseDraft[]>([]);
  const [errors, setErrors] = useState<FormErrors>(EMPTY_ERRORS);
  /** `PlanExerciseDraft.key` the catalog picker is filling; null when closed. */
  const [pickerKey, setPickerKey] = useState<string | null>(null);

  // Opening the sheet seeds it — blank for create, the plan's values for edit —
  // and closing clears it, so no draft outlives its session.
  const [lastVisible, setLastVisible] = useState(visible);
  if (visible !== lastVisible) {
    setLastVisible(visible);
    if (!visible) {
      setName("");
      setDescription("");
      setExercises([]);
      setErrors(EMPTY_ERRORS);
      setPickerKey(null);
    } else if (plan) {
      setName(plan.name ?? "");
      setDescription(plan.description ?? "");
      setExercises(
        (plan.exercises ?? []).map((exercise) =>
          createExerciseDraft({
            exerciseId: exercise.exerciseId,
            name: exercise.name,
            sets: (exercise.sets ?? []).map(planSetToDraft),
            notes: exercise.notes ?? "",
          })
        )
      );
    }
  }

  const handleClose = useCallback(() => onClose(), [onClose]);

  const patchExercise = useCallback((key: string, patch: Partial<PlanExerciseDraft>) => {
    setExercises((prev) => prev.map((ex) => (ex.key === key ? { ...ex, ...patch } : ex)));
  }, []);

  const clearExerciseError = useCallback((key: string) => {
    setErrors((prev) => {
      if (!prev.byExercise[key]) return prev;
      const byExercise = { ...prev.byExercise };
      delete byExercise[key];
      return { ...prev, byExercise };
    });
  }, []);

  const addExercise = useCallback(() => {
    setExercises((prev) => [...prev, createExerciseDraft()]);
    setErrors((prev) => ({ ...prev, exercises: undefined }));
    triggerHaptic();
  }, []);

  const removeExercise = useCallback((key: string) => {
    setExercises((prev) => prev.filter((ex) => ex.key !== key));
    setErrors((prev) => {
      const byExercise = { ...prev.byExercise };
      delete byExercise[key];
      return { ...prev, byExercise };
    });
  }, []);

  const handlePickerSelect = useCallback(
    (exercise: PickedExercise) => {
      if (pickerKey !== null) {
        patchExercise(pickerKey, { exerciseId: exercise.exerciseId, name: exercise.name });
        clearExerciseError(pickerKey);
      }
      setPickerKey(null);
      Keyboard.dismiss();
    },
    [pickerKey, patchExercise, clearExerciseError]
  );

  const handleSubmit = useCallback(() => {
    const nextErrors: FormErrors = { byExercise: {} };

    if (!name.trim()) {
      nextErrors.name = tt("validation.name_required");
    }
    if (exercises.length === 0) {
      nextErrors.exercises = tt("validation.exercises_min_one");
    }

    exercises.forEach((exercise) => {
      const exerciseErrors: ExerciseErrors = {};
      if (!exercise.exerciseId || !exercise.name.trim()) {
        exerciseErrors.exercise = tt("validation.exercise_name_required");
      }
      const setError = repsOrWeightError(exercise.sets, (key) => tt(`validation.${key}`));
      if (setError) exerciseErrors.sets = setError;
      if (exerciseErrors.exercise || exerciseErrors.sets) {
        nextErrors.byExercise[exercise.key] = exerciseErrors;
      }
    });

    setErrors(nextErrors);
    if (hasErrors(nextErrors)) {
      triggerHaptic();
      return;
    }

    const payload: CreateWorkoutPlanRequest = {
      name: name.trim(),
      description: description.trim() || undefined,
      exercises: exercises.map(
        (exercise, index): WorkoutPlanExercise => ({
          exerciseId: exercise.exerciseId,
          name: exercise.name.trim(),
          sets: exercise.sets.map(toPlanSetPayload),
          notes: exercise.notes.trim(),
          order: index,
        })
      ),
    };
    onSubmit(payload);
  }, [name, description, exercises, onSubmit, tt]);

  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const showBanner = hasErrors(errors) || !!errorMessage;

  return (
    <>
      <Modal isOpen={visible} onClose={handleClose} size="full">
        <ModalBackdrop />
        <ModalContent className={pickerKey !== null ? "h-[90%] p-0" : "max-h-[92%] p-0"}>
          {pickerKey !== null ? (
            <ExerciseCatalogContent
              onClose={() => setPickerKey(null)}
              onSelect={handlePickerSelect}
            />
          ) : (
            <>
              <ModalHeader className="border-b border-border px-5 pb-3.5 pt-4">
                <Box className="flex-1 pr-3">
                  <Text className="text-xl font-bold text-text">
                    {tt(plan ? "edit" : "create")}
                  </Text>
                  <Text className="mt-0.5 text-[13px] text-text-secondary" numberOfLines={1}>
                    {tt("description")}
                  </Text>
                </Box>
                <ModalCloseButton
                  hitSlop={8}
                  accessibilityLabel={t("common.actions.cancel")}
                  className="h-9 w-9 items-center justify-center rounded-full"
                >
                  <Icon as={CloseIcon} className="text-text-secondary" />
                </ModalCloseButton>
              </ModalHeader>

              <ScrollView
                style={{ flexShrink: 1 }}
                contentContainerClassName="gap-5 px-5 pb-6 pt-5"
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
              >
                <VStack space="sm">
                  <VStack>
                    <Text className={FIELD_LABEL}>{tt("plan_name")}</Text>
                    <Input isInvalid={!!errors.name}>
                      <InputField
                        value={name}
                        onChangeText={(value) => {
                          setName(value);
                          setErrors((prev) => ({ ...prev, name: undefined }));
                        }}
                        placeholder={tt("plan_name")}
                        editable={!isPending}
                        accessibilityLabel={tt("plan_name")}
                      />
                    </Input>
                    {errors.name ? (
                      <Text className="mt-1 text-[12px] font-medium text-danger">{errors.name}</Text>
                    ) : null}
                  </VStack>

                  <VStack>
                    <Text className={FIELD_LABEL}>
                      {tt("description_label")}
                    </Text>
                    <Textarea className="h-[72px]">
                      <TextareaInput
                        value={description}
                        onChangeText={setDescription}
                        placeholder={tt("description_placeholder")}
                        editable={!isPending}
                        accessibilityLabel={tt("description_label")}
                      />
                    </Textarea>
                  </VStack>
                </VStack>

                <VStack space="sm">
                  <HStack className="items-center justify-between">
                    <Text className={SECTION_LABEL}>
                      {tt("exercises")} ({exercises.length})
                    </Text>
                  </HStack>

                  {exercises.map((exercise, index) => {
                    const exerciseErrors = errors.byExercise[exercise.key];
                    return (
                      <Box
                        key={exercise.key}
                        className="gap-3 rounded-xl border border-border bg-card p-3"
                      >
                        <HStack className="items-center justify-between">
                          <Text
                            className="flex-1 text-[15px] font-semibold text-text"
                            numberOfLines={1}
                          >
                            {exercise.name ||
                              tt("fallback_exercise_name", { index: index + 1 })}
                          </Text>
                          <Pressable
                            onPress={() => removeExercise(exercise.key)}
                            disabled={isPending}
                            accessibilityRole="button"
                            accessibilityLabel={tt("remove")}
                            hitSlop={8}
                            className="pl-3"
                          >
                            <Icon as={TrashIcon} size="sm" className="text-danger" />
                          </Pressable>
                        </HStack>

                        <Pressable
                          onPress={() => setPickerKey(exercise.key)}
                          disabled={isPending}
                          accessibilityRole="button"
                          accessibilityLabel={tt("pick_exercise")}
                          className="flex-row items-center justify-center rounded-lg border border-dashed border-primary/50 py-2.5 active:bg-primary/5"
                        >
                          <Text className="text-[13px] font-semibold text-primary">
                            {exercise.exerciseId
                              ? tt("change_exercise")
                              : tt("pick_exercise")}
                          </Text>
                        </Pressable>
                        {exerciseErrors?.exercise ? (
                          <Text className="text-[12px] font-medium text-danger">
                            {exerciseErrors.exercise}
                          </Text>
                        ) : null}

                        <PlanSetEditor
                          sets={exercise.sets}
                          onChange={(sets) => patchExercise(exercise.key, { sets })}
                          disabled={isPending}
                          error={exerciseErrors?.sets}
                        />

                        <VStack>
                          <Text className={FIELD_LABEL}>
                            {tt("notes_label")}
                          </Text>
                          <Textarea className="h-[56px]">
                            <TextareaInput
                              value={exercise.notes}
                              onChangeText={(value) => patchExercise(exercise.key, { notes: value })}
                              placeholder={tt("notes_placeholder")}
                              editable={!isPending}
                              accessibilityLabel={tt("notes_label")}
                            />
                          </Textarea>
                        </VStack>
                      </Box>
                    );
                  })}

                  <Pressable
                    onPress={addExercise}
                    disabled={isPending}
                    accessibilityRole="button"
                    accessibilityLabel={tt("add_exercise")}
                    className="flex-row items-center justify-center gap-1 rounded-xl border border-dashed border-primary/50 py-3.5 active:bg-primary/5"
                  >
                    <Icon as={AddIcon} size="sm" className="text-primary" />
                    <Text className="text-sm font-semibold text-primary">
                      {tt("add_exercise")}
                    </Text>
                  </Pressable>

                  {errors.exercises ? (
                    <Text className="text-[12px] font-medium text-danger">{errors.exercises}</Text>
                  ) : null}
                </VStack>

                {showBanner ? (
                  <Box
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                    className="flex-row items-center gap-2 rounded-lg border border-danger-border bg-danger-surface px-3 py-2.5"
                  >
                    <Icon as={AlertCircleIcon} size="sm" className="text-danger-text" />
                    <Text className="flex-1 text-[13px] font-medium text-danger-text">
                      {errorMessage || tt("fix_fields")}
                    </Text>
                  </Box>
                ) : null}
              </ScrollView>

              <ModalFooter
                className="items-center justify-between gap-3 border-t border-border px-5 pt-3.5"
                style={{ paddingBottom: Math.max(insets.bottom, 12) + 8 }}
              >
                <Text className="flex-1 text-[12px] text-text-secondary" numberOfLines={1}>
                  {tt("plan_summary", {
                    exercises: exercises.length,
                    sets: totalSets,
                  })}
                </Text>
                <Host matchContents>
                  <Button
                    label={tt("cancel")}
                    variant="outlined"
                    onPress={handleClose}
                    disabled={isPending}
                  />
                </Host>
                <Host matchContents>
                  <Button
                    label={
                      isPending
                        ? tt("submitting")
                        : tt(plan ? "plan_update" : "plan_create")
                    }
                    onPress={handleSubmit}
                    disabled={isPending}
                  />
                </Host>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

function hasErrors(errors: FormErrors): boolean {
  return (
    !!errors.name ||
    !!errors.exercises ||
    Object.keys(errors.byExercise).length > 0
  );
}

type TranslateFn = (key: string) => string;

/** First offending field wins, so the message matches what the user typed.
 *  Receives short `validation.*` keys; the caller supplies the namespace. */
function repsOrWeightError(sets: PlanSetDraft[], t: TranslateFn): string | null {
  for (const set of sets) {
    const weight = parseNumeric(set.weight);
    if (weight !== null && weight < 0) {
      return t("weight_non_negative");
    }
    const restTime = parseNumeric(set.restTime);
    if (restTime !== null && restTime < 0) {
      return t("rest_non_negative");
    }
    const reps = parseNumeric(set.reps);
    if (reps !== null && reps < 1) {
      return t("reps_min_one");
    }
  }
  return null;
}