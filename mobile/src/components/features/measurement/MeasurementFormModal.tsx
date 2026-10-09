import { useCallback, useMemo, useState } from "react";
import { ScrollView } from "react-native";
import { Button, Host } from "@expo/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  FadeInDown,
  FadeOutUp,
  ReduceMotion,
} from "react-native-reanimated";
import { useI18n } from "@/lib/i18n";
import { todayString } from "@/lib/dates";
import { triggerHaptic } from "@/lib/haptics";
import type { BodyMeasurement } from "@/types";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Input, InputField } from "@/components/ui/input";
import { Textarea, TextareaInput } from "@/components/ui/textarea";
import { HStack } from "@/components/ui/hstack";
import { DateField } from "@/components/features/common/DateField";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalCloseButton,
} from "@/components/ui/modal";
import { Icon, AlertCircleIcon, CloseIcon } from "@/components/ui/icon";

type TranslateFn = (
  key: string,
  params?: Record<string, string | number>,
) => string;

/** Matches backend models.SupportedBodyParts. */
const BODY_PARTS = [
  "chest",
  "waist",
  "hips",
  "neck",
  "shoulders",
  "bicepLeft",
  "bicepRight",
  "forearmLeft",
  "forearmRight",
  "thighLeft",
  "thighRight",
  "calfLeft",
  "calfRight",
];

/**
 * The 13 parts flattened into the three regions an athlete actually measures,
 * left/right adjacent so the pairs line up and a Turkish label like
 * "Önkol (Sol)" gets a full cell instead of a truncated fixed-width column.
 */
const PART_GROUPS: { labelKey: string; parts: string[] }[] = [
  {
    labelKey: "body_measurement.form.group_torso",
    parts: ["chest", "waist", "hips", "neck", "shoulders"],
  },
  {
    labelKey: "body_measurement.form.group_arms",
    parts: ["bicepLeft", "bicepRight", "forearmLeft", "forearmRight"],
  },
  {
    labelKey: "body_measurement.form.group_legs",
    parts: ["thighLeft", "thighRight", "calfLeft", "calfRight"],
  },
];

/**
 * Plausibility bounds only. Anything outside these is a typo, not a body —
 * deliberately far wider than any human measurement so real data is never
 * rejected.
 */
const WEIGHT_RANGE = { min: 1, max: 500 };
const BODY_FAT_RANGE = { min: 1, max: 75 };
const PART_RANGE = { min: 1, max: 250 };

const EASE_OUT_STRONG = Easing.bezier(0.23, 1, 0.32, 1);

const SECTION_LABEL =
  "text-[11px] font-bold uppercase tracking-[1px] text-text-tertiary";
const FIELD_LABEL = "mb-1 text-[13px] font-semibold text-text-body";

const PART_LABEL_PREFIX = "body_measurement.list.part_labels.";

function partLabel(t: TranslateFn, key: string): string {
  const translated = t(PART_LABEL_PREFIX + key);
  return translated === PART_LABEL_PREFIX + key ? key : translated;
}

/**
 * Accepts a comma decimal separator. Turkish keyboards emit "75,5", and
 * `Number("75,5")` is NaN — which would have shown a validation error on a
 * perfectly valid entry.
 */
function normalizeNumeric(value: string): string {
  return value.trim().replace(",", ".");
}

/** Parsed value, or `null` when the field is blank or not a finite number. */
export function parseNumeric(value: string): number | null {
  const raw = normalizeNumeric(value);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function buildMeasurementBody(
  date: string,
  weight: string,
  bodyFat: string,
  notes: string,
  parts: Record<string, string>,
): Record<string, unknown> {
  const body: Record<string, unknown> = { date };
  if (weight.trim()) body.weight = parseNumeric(weight) as number;
  if (bodyFat.trim()) body.bodyFatPct = parseNumeric(bodyFat) as number;
  if (notes.trim()) body.notes = notes.trim();
  body.weightUnit = "kg";
  // Backend expects parts as Record<string, { value: number }>
  const pv: Record<string, { value: number }> = {};
  Object.entries(parts).forEach(([k, v]) => {
    if (v.trim()) pv[k] = { value: parseNumeric(v) as number };
  });
  if (Object.keys(pv).length > 0) body.parts = pv;
  return body;
}

export function isValidNumber(value: string): boolean {
  if (!value.trim()) return true;
  const n = parseNumeric(value);
  return n !== null && n >= 0;
}

interface FormErrors {
  weight?: string;
  bodyFat?: string;
  parts: Record<string, string>;
}

const EMPTY_ERRORS: FormErrors = { parts: {} };

function validateForm(
  weight: string,
  bodyFat: string,
  parts: Record<string, string>,
  t: TranslateFn,
): FormErrors {
  const errors: FormErrors = { parts: {} };

  const w = parseNumeric(weight);
  if (w !== null && (w < WEIGHT_RANGE.min || w > WEIGHT_RANGE.max)) {
    errors.weight = t("body_measurement.form.validation.weight_range");
  }

  const bf = parseNumeric(bodyFat);
  if (bf !== null && (bf < BODY_FAT_RANGE.min || bf > BODY_FAT_RANGE.max)) {
    errors.bodyFat = t("body_measurement.form.validation.body_fat_range");
  }

  for (const [key, raw] of Object.entries(parts)) {
    if (!raw.trim()) continue;
    const v = parseNumeric(raw);
    if (v === null || v < PART_RANGE.min || v > PART_RANGE.max) {
      errors.parts[key] = t("body_measurement.form.validation.part_range", {
        part: partLabel(t, key),
      });
    }
  }

  return errors;
}

interface Draft {
  date: string;
  weight: string;
  bodyFat: string;
  notes: string;
  parts: Record<string, string>;
}

/** Seeds the editable draft from the record being edited, or a blank one. */
function draftFrom(measurement?: BodyMeasurement | null): Draft {
  const parts: Record<string, string> = {};
  for (const [k, part] of Object.entries(measurement?.parts ?? {})) {
    if (part?.value != null) parts[k] = String(part.value);
  }
  return {
    date: measurement?.date ?? todayString(),
    weight: measurement?.weight != null ? String(measurement.weight) : "",
    bodyFat:
      measurement?.bodyFatPct != null ? String(measurement.bodyFatPct) : "",
    notes: measurement?.notes ?? "",
    parts,
  };
}

function hasErrors(errors: FormErrors): boolean {
  return (
    !!errors.weight ||
    !!errors.bodyFat ||
    Object.keys(errors.parts).length > 0
  );
}

export { partLabel };

export interface MeasurementFormModalProps {
  isOpen: boolean;
  measurement?: BodyMeasurement | null;
  isPending?: boolean;
  onClose: () => void;
  onSubmit: (body: Record<string, unknown>) => void;
}

export function MeasurementFormModal({
  isOpen,
  measurement,
  isPending = false,
  onClose,
  onSubmit,
}: MeasurementFormModalProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  const isEditing = measurement != null;

  // One draft object so a record swap is a single state write.
  const [draft, setDraft] = useState<Draft>(() => draftFrom(measurement));
  const [errors, setErrors] = useState<FormErrors>(EMPTY_ERRORS);

  // Rebuild the draft whenever the sheet opens or the parent swaps the record.
  // Adjusting state during render (rather than in an effect) is React's
  // documented pattern here: it re-renders before anything is painted, so no
  // stale field is ever shown — and no cascading render is queued.
  const sessionKey = `${isOpen}:${measurement?.measurementId ?? "new"}`;
  const [lastSessionKey, setLastSessionKey] = useState(sessionKey);
  if (sessionKey !== lastSessionKey) {
    setLastSessionKey(sessionKey);
    setDraft(draftFrom(measurement));
    setErrors(EMPTY_ERRORS);
  }

  const { date, weight, bodyFat, notes, parts } = draft;

  const patchDraft = useCallback((patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
  }, []);

  const closeForm = useCallback(() => {
    onClose();
  }, [onClose]);

  const setWeightValue = useCallback(
    (value: string) => {
      patchDraft({ weight: value });
      setErrors((e) => (e.weight ? { ...e, weight: undefined } : e));
    },
    [patchDraft],
  );

  const setBodyFatValue = useCallback(
    (value: string) => {
      patchDraft({ bodyFat: value });
      setErrors((e) => (e.bodyFat ? { ...e, bodyFat: undefined } : e));
    },
    [patchDraft],
  );

  const setPartValue = useCallback((key: string, value: string) => {
    // Functional update so the callback identity stays stable across keystrokes.
    setDraft((d) => ({ ...d, parts: { ...d.parts, [key]: value } }));
    setErrors((e) => {
      if (!e.parts[key]) return e;
      const next = { ...e.parts };
      delete next[key];
      return { ...e, parts: next };
    });
  }, []);

  const handleSave = useCallback(() => {
    const nextErrors = validateForm(weight, bodyFat, parts, t);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) {
      // Same frame as the inline errors appearing — never the haptic's only job.
      triggerHaptic();
      return;
    }
    onSubmit(buildMeasurementBody(date, weight, bodyFat, notes, parts));
  }, [date, weight, bodyFat, notes, parts, onSubmit, t]);

  const filledParts = useMemo(
    () => Object.values(parts).filter((v) => v.trim()).length,
    [parts],
  );

  const showErrors = hasErrors(errors);

  const modalTitle = isEditing
    ? t("body_measurement.edit.title")
    : t("body_measurement.form.create_title");
  const saveLabel = isPending
    ? t("common.actions.saving")
    : isEditing
      ? t("common.actions.update")
      : t("common.actions.save");

  return (
    <Modal isOpen={isOpen} onClose={closeForm} size="full">
      <ModalBackdrop />
      <ModalContent className="max-h-[92%] p-0">
        {/* Sticky header: which record is open, and a 44pt close target. */}
        <ModalHeader className="border-b border-border px-5 pb-3.5 pt-4">
          <Box className="flex-1 pr-3">
            <Text className="text-xl font-bold text-text" numberOfLines={1}>
              {modalTitle}
            </Text>
            {isEditing ? (
              <Text className="mt-0.5 text-[13px] text-text-tertiary" numberOfLines={1}>
                {date}
              </Text>
            ) : null}
          </Box>
          <ModalCloseButton
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full"
          >
            <Icon as={CloseIcon} className="text-text-secondary" />
          </ModalCloseButton>
        </ModalHeader>

        <ScrollView
          // flexShrink (not flex-1) so the scroll area keeps its content height
          // and only gives way once ModalContent hits its max-h.
          style={{ flexShrink: 1 }}
          contentContainerClassName="gap-5 px-5 pb-6 pt-5"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Date — creating only. When editing, the record's date is its
              identity and already shown in the header. */}
          {!isEditing ? (
            <Box>
              <Text className={FIELD_LABEL}>
                {t("body_measurement.form.date_label")}
              </Text>
              <DateField
                value={date}
                onChange={(v) => patchDraft({ date: v })}
              />
            </Box>
          ) : null}

          {/* Headline metrics */}
          <Box>
            <Text className={SECTION_LABEL}>{t("body_measurement.form.metrics_label")}</Text>
            <HStack space="sm" className="mt-2 items-start">
              <Box className="flex-1">
                <Text className={FIELD_LABEL}>
                  {t("body_measurement.form.weight_label")}
                </Text>
                <Input isInvalid={!!errors.weight}>
                  <InputField
                    value={weight}
                    onChangeText={setWeightValue}
                    // "numeric" has no decimal point on Android; weight and
                    // body fat are both decimal values.
                    keyboardType="decimal-pad"
                    placeholder="75.0"
                    accessibilityLabel={t("body_measurement.form.weight_label")}
                  />
                </Input>
                {errors.weight ? (
                  <Text className="mt-1 text-[12px] text-danger">
                    {errors.weight}
                  </Text>
                ) : null}
              </Box>
              <Box className="flex-1">
                <Text className={FIELD_LABEL}>
                  {t("body_measurement.form.body_fat_label")}
                </Text>
                <Input isInvalid={!!errors.bodyFat}>
                  <InputField
                    value={bodyFat}
                    onChangeText={setBodyFatValue}
                    keyboardType="decimal-pad"
                    placeholder="15.0"
                    accessibilityLabel={t("body_measurement.form.body_fat_label")}
                  />
                </Input>
                {errors.bodyFat ? (
                  <Text className="mt-1 text-[12px] text-danger">
                    {errors.bodyFat}
                  </Text>
                ) : null}
              </Box>
            </HStack>
          </Box>

          {/* 13 optional parts, grouped into regions instead of one wall of rows */}
          <Box>
            <HStack
              space="sm"
              className="items-center justify-between"
            >
              <Text className={SECTION_LABEL}>
                {t("body_measurement.form.parts_label")}
              </Text>
              <Text className="text-[11px] font-semibold text-text-tertiary">
                {t("body_measurement.form.parts_progress", {
                  filled: filledParts,
                  total: BODY_PARTS.length,
                })}
              </Text>
            </HStack>
            <Text className="mt-1 text-[12px] text-text-tertiary">
              {t("body_measurement.form.parts_hint")}
            </Text>

            <Box>
              {PART_GROUPS.map((group) => (
                <Box key={group.labelKey} className="mt-3">
                  <Text className="mb-2 text-[12px] font-semibold text-text-secondary">
                    {t(group.labelKey)}
                  </Text>
                  <Box className="flex-row flex-wrap justify-between gap-y-2.5">
                    {group.parts.map((part) => (
                      <Box key={part} className="w-[48%]">
                        <Text className={FIELD_LABEL} numberOfLines={1}>
                          {partLabel(t, part)}
                        </Text>
                        <Input isInvalid={!!errors.parts[part]}>
                          <InputField
                            value={parts[part] ?? ""}
                            onChangeText={(v) => setPartValue(part, v)}
                            keyboardType="decimal-pad"
                            placeholder="--"
                            accessibilityLabel={t("body_measurement.form.group_parts_label", {
                              part: partLabel(t, part),
                            })}
                          />
                        </Input>
                        {errors.parts[part] ? (
                          <Text className="mt-1 text-[12px] text-danger">
                            {errors.parts[part]}
                          </Text>
                        ) : null}
                      </Box>
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Notes */}
          <Box>
            <Text className={FIELD_LABEL}>
              {t("body_measurement.form.notes_label")}
            </Text>
            <Textarea>
              <TextareaInput
                value={notes}
                onChangeText={(v) => patchDraft({ notes: v })}
                placeholder={t("body_measurement.form.notes_placeholder")}
              />
            </Textarea>
          </Box>

          {/* Summary. Inline errors already mark each field; this also covers a
              bad part that is scrolled out of view above. */}
          {showErrors ? (
            <Animated.View
              entering={FadeInDown.duration(200)
                .easing(EASE_OUT_STRONG)
                .reduceMotion(ReduceMotion.System)}
              exiting={FadeOutUp.duration(150).reduceMotion(ReduceMotion.System)}
              className="flex-row items-center gap-2 rounded-lg border border-danger-border bg-danger-surface px-3 py-2.5"
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              <Icon as={AlertCircleIcon} size="sm" className="text-danger-text" />
              <Text className="flex-1 text-[13px] font-medium text-danger-text">
                {t("body_measurement.form.validation.fix_fields")}
              </Text>
            </Animated.View>
          ) : null}
        </ScrollView>

        {/* Sticky footer — Save stays reachable no matter how far the 13 parts
            have pushed the content. */}
        <ModalFooter
          className="gap-3 border-t border-border px-5 pt-3.5"
          style={{ paddingBottom: Math.max(insets.bottom, 12) + 8 }}
        >
          <Host matchContents>
            <Button
              label={t("common.actions.cancel")}
              variant="outlined"
              onPress={closeForm}
              disabled={isPending}
            />
          </Host>
          <Host matchContents>
            <Button
              label={saveLabel}
              onPress={handleSave}
              disabled={isPending}
            />
          </Host>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

