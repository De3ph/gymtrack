import React from "react";
import { useI18n } from "@/lib/i18n";
import type { NewExercise } from "@/stores/workout-form-store";
import { Text } from "@/components/ui/text";
import { Button, Host } from "@expo/ui";
import { Input, InputField } from "@/components/ui/input";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Icon, TrashIcon } from "@/components/ui/icon";
import { Card } from "@/components/ui/card";

interface ExerciseFormCardProps {
  exercise: NewExercise;
  index: number;
  totalExercises: number;
  onRemoveExercise: (exId: string) => void;
  onUpdateName: (exId: string, name: string) => void;
  onUpdateNotes: (exId: string, notes: string) => void;
  onOpenPicker: (exId: string) => void;
  onAddSet: (exId: string) => void;
  onRemoveSet: (exId: string, setId: string) => void;
  onUpdateSetWeight: (exId: string, setId: string, weight: string) => void;
  onUpdateSetReps: (exId: string, setId: string, reps: string) => void;
}

export const ExerciseFormCard = React.memo(function ExerciseFormCard({
  exercise,
  index,
  totalExercises,
  onRemoveExercise,
  onUpdateName,
  onUpdateNotes,
  onOpenPicker,
  onAddSet,
  onRemoveSet,
  onUpdateSetWeight,
  onUpdateSetReps,
}: ExerciseFormCardProps) {
  const { t } = useI18n();
  const setNumberLabel = t("workout.form.exercise.sets.set_number");
  const canRemove = totalExercises > 1;

  return (
    <Card className="border border-border bg-card p-3.5">
      <HStack className="items-center justify-between">
        <Text className="text-[15px] font-semibold text-text">
          {t("workout.form.exercise.name.label") + " " + String(index + 1)}
        </Text>
        {canRemove && (
          <Pressable
            onPress={() => onRemoveExercise(exercise.id)}
            hitSlop={8}
            accessibilityLabel={t("common.actions.remove")}
          >
            <Text className="text-sm font-medium text-danger">
              {t("common.actions.remove")}
            </Text>
          </Pressable>
        )}
      </HStack>

      <HStack space="sm" className="mt-2 items-center">
        <Input className="flex-1">
          <InputField
            value={exercise.name}
            onChangeText={(v: string) => onUpdateName(exercise.id, v)}
            placeholder={t("workout.form.exercise.name.label")}
          />
        </Input>
        <Host matchContents>
          <Button
            label={t("workout.form.exercise.browse")}
            onPress={() => onOpenPicker(exercise.id)}
          />
        </Host>
      </HStack>

      <Input className="mt-2 min-h-[60px]">
        <InputField
          value={exercise.notes}
          onChangeText={(v: string) => onUpdateNotes(exercise.id, v)}
          placeholder={t("workout.form.exercise.notes")}
          multiline
        />
      </Input>

      <Text className="mb-1.5 mt-3 text-[13px] font-semibold text-text-body">
        {t("workout.form.exercise.sets.label")}
      </Text>

      <VStack space="xs">
        {exercise.sets.map((s, sIdx) => (
          <HStack key={s.id} space="sm" className="items-center">
            <Text className="w-10 text-[13px] text-text-secondary">
              {setNumberLabel.replace("{number}", String(sIdx + 1))}
            </Text>
            <Input className="flex-1">
              <InputField
                value={s.weight}
                onChangeText={(v: string) => onUpdateSetWeight(exercise.id, s.id, v)}
                placeholder={t("workout.form.exercise.sets.weight")}
                keyboardType="numeric"
                style={{ textAlignVertical: "center" }}
              />
            </Input>
            <Input className="flex-1">
              <InputField
                value={s.reps}
                onChangeText={(v: string) => onUpdateSetReps(exercise.id, s.id, v)}
                placeholder={t("workout.form.exercise.sets.reps")}
                keyboardType="numeric"
                style={{ textAlignVertical: "center" }}
              />
            </Input>
            {exercise.sets.length > 1 && (
              <Pressable
                onPress={() => onRemoveSet(exercise.id, s.id)}
                hitSlop={8}
                accessibilityLabel={t("workout.form.exercise.sets.remove")}
              >
                <Icon as={TrashIcon} className="text-danger" size="sm" />
              </Pressable>
            )}
          </HStack>
        ))}
      </VStack>

      <Pressable
        onPress={() => onAddSet(exercise.id)}
        hitSlop={4}
        accessibilityLabel={t("workout.form.exercise.sets.add")}
      >
        <Text className="mt-2 py-2 text-sm font-medium text-primary">
          + {t("workout.form.exercise.sets.add")}
        </Text>
      </Pressable>
    </Card>
  );
});
