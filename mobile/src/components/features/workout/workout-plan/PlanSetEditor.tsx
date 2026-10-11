import { useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { triggerHaptic } from "@/lib/haptics";
import { parseNumeric } from "@/lib/numbers";
import type { WeightUnit, WorkoutPlanSet } from "@/types";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Input, InputField } from "@/components/ui/input";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "@/components/ui/pressable";
import { Icon, AddIcon, TrashIcon } from "@/components/ui/icon";

const UNITS: WeightUnit[] = ["kg", "lbs"];

const FIELD_LABEL = "mb-1 text-[11px] font-bold uppercase tracking-[1px] text-text-tertiary";

/**
 * Editable set row. The numeric fields stay raw strings so a field can be
 * cleared and retyped — storing numbers would render "0" the moment the user
 * deleted the contents. Parsing happens once, on submit.
 */
export interface PlanSetDraft {
  /** Stable identity for list keys; draft sets have no server id yet. */
  key: string;
  weight: string;
  weightUnit: WeightUnit;
  reps: string;
  restTime: string;
}

let nextSetKey = 0;

function nextKey(): string {
  nextSetKey += 1;
  return `set-${nextSetKey}`;
}

/** A new set inherits the last set's values, matching the web plan editor. */
export function createPlanSetDraft(source?: PlanSetDraft): PlanSetDraft {
  return {
    key: nextKey(),
    weight: source?.weight ?? "0",
    weightUnit: source?.weightUnit ?? "kg",
    reps: source?.reps ?? "10",
    restTime: source?.restTime ?? "60",
  };
}

export function toPlanSetPayload(draft: PlanSetDraft): WorkoutPlanSet {
  return {
    weight: parseNumeric(draft.weight) ?? 0,
    weightUnit: draft.weightUnit,
    reps: Math.round(parseNumeric(draft.reps) ?? 0),
    restTime: Math.round(parseNumeric(draft.restTime) ?? 0),
  };
}

/** Message namespace the labels are read from — mirrors the web form dialog. */
export type WorkoutPlanFormNamespace = "trainer.workout_plans" | "athlete.workout_plans";

interface PlanSetEditorProps {
  sets: PlanSetDraft[];
  onChange: (sets: PlanSetDraft[]) => void;
  disabled?: boolean;
  /** Message from the parent form's validation pass, shown under the block. */
  error?: string;
  namespace?: WorkoutPlanFormNamespace;
}

export function PlanSetEditor({
  sets,
  onChange,
  disabled = false,
  error,
  namespace = "trainer.workout_plans",
}: PlanSetEditorProps) {
  const { t } = useI18n();

  const tt = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      t(`${namespace}.${key}`, params),
    [t, namespace]
  );

  const patchSet = useCallback(
    (key: string, patch: Partial<PlanSetDraft>) => {
      onChange(sets.map((set) => (set.key === key ? { ...set, ...patch } : set)));
    },
    [sets, onChange]
  );

  const addSet = useCallback(() => {
    onChange([...sets, createPlanSetDraft(sets[sets.length - 1])]);
    triggerHaptic();
  }, [sets, onChange]);

  // The last remaining set cannot be removed: the API requires at least one.
  const removeSet = useCallback(
    (key: string) => {
      if (sets.length === 1) return;
      onChange(sets.filter((set) => set.key !== key));
    },
    [sets, onChange]
  );

  return (
    <VStack space="sm">
      {sets.map((set, index) => (
        <Box
          key={set.key}
          className="rounded-lg border border-border bg-surface-subtle p-2.5"
        >
          <HStack className="mb-2 items-center justify-between">
            <Text className="text-[12px] font-bold text-text-secondary">
              {tt("set_number", { number: index + 1 })}
            </Text>
            <HStack space="xs">
              {UNITS.map((unit) => {
                const selected = set.weightUnit === unit;
                return (
                  <Pressable
                    key={unit}
                    onPress={() => patchSet(set.key, { weightUnit: unit })}
                    disabled={disabled}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={unit}
                    hitSlop={6}
                    className={`rounded-md px-2 py-0.5 ${
                      selected ? "bg-primary" : "bg-border/60"
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-bold ${
                        selected ? "text-primary-foreground" : "text-text-secondary"
                      }`}
                    >
                      {unit}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => removeSet(set.key)}
                disabled={disabled || sets.length === 1}
                accessibilityRole="button"
                accessibilityLabel={tt("remove_set", { number: index + 1 })}
                hitSlop={8}
                className="pl-1"
              >
                <Icon
                  as={TrashIcon}
                  size="xs"
                  className={
                    sets.length === 1 ? "text-text-tertiary" : "text-danger"
                  }
                />
              </Pressable>
            </HStack>
          </HStack>

          <HStack space="sm">
            <VStack className="flex-1">
              <Text className={FIELD_LABEL}>
                {tt("weight")}
              </Text>
              <Input isInvalid={!!error}>
                <InputField
                  value={set.weight}
                  onChangeText={(value) => patchSet(set.key, { weight: value })}
                  keyboardType="decimal-pad"
                  editable={!disabled}
                  accessibilityLabel={tt("weight")}
                />
              </Input>
            </VStack>
            <VStack className="flex-1">
              <Text className={FIELD_LABEL}>
                {tt("reps")}
              </Text>
              <Input isInvalid={!!error}>
                <InputField
                  value={set.reps}
                  onChangeText={(value) => patchSet(set.key, { reps: value })}
                  keyboardType="number-pad"
                  editable={!disabled}
                  accessibilityLabel={tt("reps")}
                />
              </Input>
            </VStack>
            <VStack className="flex-1">
              <Text className={FIELD_LABEL}>
                {tt("rest")}
              </Text>
              <Input isInvalid={!!error}>
                <InputField
                  value={set.restTime}
                  onChangeText={(value) => patchSet(set.key, { restTime: value })}
                  keyboardType="number-pad"
                  editable={!disabled}
                  accessibilityLabel={tt("rest")}
                />
              </Input>
            </VStack>
          </HStack>
        </Box>
      ))}

      <Pressable
        onPress={addSet}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={tt("add_set")}
        className="flex-row items-center justify-center gap-1 rounded-lg border border-dashed border-border py-2 active:bg-surface-subtle"
      >
        <Icon as={AddIcon} size="xs" className="text-text-secondary" />
        <Text className="text-[13px] font-semibold text-text-secondary">
          {tt("add_set")}
        </Text>
      </Pressable>

      {error ? (
        <Text className="text-[12px] font-medium text-danger">{error}</Text>
      ) : null}
    </VStack>
  );
}
