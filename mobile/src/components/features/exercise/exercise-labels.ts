import { useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import type { Equipment, MuscleGroup } from "@/types";

/**
 * Codes the catalog actually uses, so a lookup key can be checked before it is
 * handed to the translation function. Mirrors web `exercise-labels.ts`:
 * a code absent from these lists has no translation, and calling `t()` for it
 * would surface a raw dotted key as the visible label.
 */
export const MUSCLE_GROUP_CODES = [
  "chest",
  "back",
  "lats",
  "traps",
  "shoulders",
  "arms",
  "biceps",
  "triceps",
  "forearms",
  "legs",
  "quadriceps",
  "hamstrings",
  "glutes",
  "calves",
  "core",
  "abs",
  "full_body",
  "other",
] as const;

export const EQUIPMENT_CODES = [
  "barbell",
  "dumbbell",
  "kettlebell",
  "cable",
  "machine",
  "smith_machine",
  "bodyweight",
  "band",
  "resistance_band",
  "ez_bar",
  "trap_bar",
  "bench",
  "other",
] as const;

/**
 * Normalises a stored code to a translation key. Seed data is inconsistent
 * about separators (`resistance-band` vs `resistance_band`); without folding
 * hyphens to underscores half the catalog would silently lose its translation.
 */
export function normalizeCode(code?: string): string {
  return (code ?? "").trim().toLowerCase().replace(/-/g, "_");
}

interface LookupRow {
  code?: string;
  description?: string;
}

export interface ExerciseLookupLabels {
  muscleGroupLabel: (muscleGroup: MuscleGroup | undefined) => string;
  equipmentLabel: (equipment: Equipment | undefined) => string;
}

/**
 * Localised display names for muscle groups and equipment. Resolution order is
 * translation, then description, then a generic fallback — a row is never
 * rendered blank. Shared by filters, cards, and the detail page so one
 * exercise never shows a translated label in one place and the raw DB string
 * in another.
 */
export function useExerciseLookupLabels(): ExerciseLookupLabels {
  const { t } = useI18n();

  const resolve = useCallback(
    (
      row: LookupRow | undefined,
      knownCodes: readonly string[],
      namespace: "muscle_groups" | "equipment",
    ): string => {
      if (!row) return t("exercise.library.unknown");
      const code = normalizeCode(row.code);
      if (code && knownCodes.includes(code)) {
        return t(`exercise.${namespace}.${code}`);
      }
      const description = row.description?.trim();
      return description || t("exercise.library.unknown");
    },
    [t],
  );

  const muscleGroupLabel = useCallback(
    (muscleGroup: MuscleGroup | undefined) =>
      resolve(muscleGroup, MUSCLE_GROUP_CODES, "muscle_groups"),
    [resolve],
  );

  const equipmentLabel = useCallback(
    (equipment: Equipment | undefined) =>
      resolve(equipment, EQUIPMENT_CODES, "equipment"),
    [resolve],
  );

  return { muscleGroupLabel, equipmentLabel };
}
