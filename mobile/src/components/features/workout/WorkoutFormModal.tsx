import React from "react";
import { useI18n } from "@/lib/i18n";
import { Button, Host } from "@expo/ui";
import { ScrollView } from "react-native";
import { ExercisePicker } from "./ExercisePicker";
import { ExerciseFormCard } from "./ExerciseFormCard";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { DateField } from "@/components/features/common/DateField";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "@/components/ui/pressable";
import { Icon, CloseIcon } from "@/components/ui/icon";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
} from "@/components/ui/modal";
import { useWorkoutFormStore } from "@/stores/workout-form-store";

interface WorkoutFormModalProps {
  onSubmit: () => void;
  isPending: boolean;
}

export function WorkoutFormModal({ onSubmit, isPending }: WorkoutFormModalProps) {
  const { t } = useI18n();
  const {
    modalVisible,
    editingWorkout,
    newDate,
    newExercises,
    submitError,
    pickerVisible,
    closeModalAndReset,
    setNewDate,
    openPickerFor,
    setPickerVisible,
    handleExerciseSelect,
    updateExerciseName,
    updateExerciseNotes,
    addExercise,
    removeExercise,
    addSet,
    removeSet,
    updateSetReps,
    updateSetWeight,
  } = useWorkoutFormStore();

  const title = editingWorkout
    ? t("workout.edit_dialog.title")
    : t("workout.form.title");
  const submitLabel = editingWorkout
    ? t("workout.edit_dialog.save_changes")
    : t("workout.form.submit");

  return (
    <>
      <Modal isOpen={modalVisible} onClose={closeModalAndReset} size="full">
        <ModalBackdrop />
        <ModalContent className="justify-end rounded-t-2xl p-0">
          <ModalHeader className="items-center justify-between border-b border-border px-5 pb-3 pt-4">
            <Text className="text-[20px] font-bold text-text">{title}</Text>
            <ModalCloseButton>
              <Icon as={CloseIcon} className="text-text-secondary" size="md" />
            </ModalCloseButton>
          </ModalHeader>

          <ModalBody className="m-0 p-0">
            <ScrollView className="flex-1">
              <VStack style={{ padding: 20, paddingBottom: 32, gap: 16 }}>
                <Box>
                  <Text className="mb-1.5 text-sm font-semibold text-text">
                    {t("workout.form.date.label")}
                  </Text>
                  <DateField
                    value={newDate}
                    onChange={setNewDate}
                    disabled={!!editingWorkout}
                  />
                </Box>

                {newExercises.map((ex, exIdx) => (
                  <ExerciseFormCard
                    key={ex.id}
                    exercise={ex}
                    index={exIdx}
                    totalExercises={newExercises.length}
                    onRemoveExercise={removeExercise}
                    onUpdateName={updateExerciseName}
                    onUpdateNotes={updateExerciseNotes}
                    onOpenPicker={openPickerFor}
                    onAddSet={addSet}
                    onRemoveSet={removeSet}
                    onUpdateSetWeight={updateSetWeight}
                    onUpdateSetReps={updateSetReps}
                  />
                ))}

                <Pressable
                  onPress={addExercise}
                  hitSlop={4}
                  accessibilityLabel={t("workout.form.add_exercise")}
                >
                  <Box className="items-center rounded-xl border border-dashed border-primary py-3.5">
                    <Text className="text-[15px] font-semibold text-primary">
                      + {t("workout.form.add_exercise")}
                    </Text>
                  </Box>
                </Pressable>

                {submitError ? (
                  <Box className="rounded border-l-4 border-l-danger bg-danger-surface p-3">
                    <Text className="text-sm font-medium text-danger-text">
                      {submitError}
                    </Text>
                  </Box>
                ) : null}
              </VStack>
            </ScrollView>
          </ModalBody>

          <HStack className="gap-3 border-t border-border bg-card px-5 py-3">
            <Host matchContents style={{ flex: 1 }}>
              <Button
                label={t("common.actions.cancel")}
                variant="outlined"
                onPress={closeModalAndReset}
                disabled={isPending}
              />
            </Host>
            <Host matchContents style={{ flex: 1 }}>
              <Button
                label={submitLabel}
                onPress={onSubmit}
                disabled={isPending}
              />
            </Host>
          </HStack>
        </ModalContent>
      </Modal>

      <ExercisePicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleExerciseSelect}
      />
    </>
  );
}
