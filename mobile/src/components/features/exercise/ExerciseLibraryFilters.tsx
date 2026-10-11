import React, { useCallback, useMemo, useState } from "react";
import { ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useI18n } from "@/lib/i18n";
import { triggerHaptic } from "@/lib/haptics";
import type { Equipment, MuscleGroup } from "@/types";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Pressable } from "@/components/ui/pressable";
import {
  Input,
  InputField,
  InputIcon,
  InputSlot,
} from "@/components/ui/input";
import { SearchIcon } from "@/components/ui/icon";
import { useAppColors } from "@/lib/colors";
import { useExerciseLookupLabels } from "./exercise-labels";

export interface ExerciseLibraryFilterState {
  query: string;
  muscleGroupId?: number;
  equipmentId?: number;
  category?: string;
}

interface ExerciseLibraryFiltersProps {
  value: ExerciseLibraryFilterState;
  categories: string[];
  muscleGroups: MuscleGroup[];
  equipment: Equipment[];
  resultCount: number;
  totalCount: number;
  onChange: (next: ExerciseLibraryFilterState) => void;
}

/**
 * Filter bar for the exercise library. Search + collapsible filter sheet
 * (category + muscle-group + equipment chip rows, result count, reset):
 *
 * - better-layout: space groups the sections (no separator lines); the search
 *   row and filter toggle sit on one shared edge; the panel is progressive
 *   disclosure behind an explicit toggle with an active-count badge, so the
 *   grid stays the primary content instead of three always-open chip rows.
 * - better-interface: the toggle carries the state — count badge + "Filters"
 *   label when collapsed, "Hide" + chevron affordance when open — so hidden
 *   content is always hinted, never a mystery.
 * - interaction-design: open/close and chip selection confirm with a light
 *   haptic on press; chip state flips outline→filled instantly (100-150ms
 *   micro-feedback band), no layout animation to jank the FlashList below.
 * - better-accessibility: toggle is a real button with expanded state, chip
 *   rows are labelled groups with selected state, the result count is a
 *   stable polite status region, icon-only controls keep accessible names.
 * - gluestack-ui-v5: compound Input (icon in InputSlot), semantic tokens
 *   only, press feedback via active: states — no inline styles.
 *
 * Filters run entirely client-side against the fetched catalog — no request
 * per keystroke, and category filtering works even though the backend search
 * endpoint accepts only muscle group and equipment.
 */
export const ExerciseLibraryFilters = React.memo(
  function ExerciseLibraryFilters({
    value,
    categories,
    muscleGroups,
    equipment,
    resultCount,
    totalCount,
    onChange,
  }: ExerciseLibraryFiltersProps) {
    const { t } = useI18n();
    const colors = useAppColors();
    const { muscleGroupLabel, equipmentLabel } = useExerciseLookupLabels();
    // Progressive disclosure: the three chip rows live behind this toggle so
    // the grid owns the first screen. Default open only when the parent
    // already carries filters (deep-link / restored state), otherwise closed.
    const [expanded, setExpanded] = useState(
      () =>
        value.muscleGroupId !== undefined ||
        value.equipmentId !== undefined ||
        value.category !== undefined,
    );

    const activeFilterCount =
      (value.muscleGroupId !== undefined ? 1 : 0) +
      (value.equipmentId !== undefined ? 1 : 0) +
      (value.category !== undefined ? 1 : 0);

    const hasActiveFilters =
      value.query !== "" || activeFilterCount > 0;

    const toggleExpanded = useCallback(() => {
      triggerHaptic();
      setExpanded((prev) => !prev);
    }, []);

    const clearQuery = useCallback(
      () => onChange({ ...value, query: "" }),
      [onChange, value],
    );

    const clearAll = useCallback(() => {
      triggerHaptic();
      onChange({ query: "" });
    }, [onChange]);

    const resultLabel = useMemo(() => {
      if (hasActiveFilters) {
        return t("exercise.library.results_filtered", {
          count: resultCount,
          total: totalCount,
        });
      }
      return t("exercise.library.results_total", { count: totalCount });
    }, [hasActiveFilters, resultCount, totalCount, t]);

    const muscleOptions = useMemo(
      () =>
        muscleGroups
          .filter((g) => typeof g.id === "number")
          .map((g) => ({
            id: g.id as number,
            label: muscleGroupLabel(g),
          })),
      [muscleGroups, muscleGroupLabel],
    );

    const equipmentOptions = useMemo(
      () =>
        equipment
          .filter((e) => typeof e.id === "number")
          .map((e) => ({
            id: e.id as number,
            label: equipmentLabel(e),
          })),
      [equipment, equipmentLabel],
    );

    return (
      <Box className="gap-4">
        {/* Search + filter toggle share one row: query is the primary tool,
            the toggle carries collapsed/expanded state with a count badge. */}
        <Box className="flex-row items-center gap-2">
          <Input className="min-h-11 flex-1 rounded-full border-border bg-card px-1">
            <InputSlot className="pl-3">
              <InputIcon as={SearchIcon} />
            </InputSlot>
            <InputField
              value={value.query}
              onChangeText={(query) => onChange({ ...value, query })}
              placeholder={t("exercise.library.search_placeholder")}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel={t("exercise.library.filter_search")}
            />
            {value.query !== "" ? (
              <InputSlot>
                <Pressable
                  onPress={clearQuery}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={t("common.actions.clear")}
                  className="h-8 w-8 items-center justify-center rounded-full active:bg-surface-subtle"
                >
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={18}
                    color={colors.textTertiary}
                  />
                </Pressable>
              </InputSlot>
            ) : null}
          </Input>

          <FilterToggleButton
            expanded={expanded}
            activeCount={activeFilterCount}
            onPress={toggleExpanded}
          />
        </Box>

        {/* Collapsed hint: only when filters diverge from "show everything". */}
        {!expanded && hasActiveFilters ? (
          <Text
            accessibilityLiveRegion="polite"
            className="text-xs text-text-secondary"
          >
            {resultLabel}
          </Text>
        ) : null}

        {expanded ? (
          <Box className="gap-4 rounded-2xl border border-border bg-card p-4">
            <Box className="flex-row items-center justify-between">
              <Text className="text-[10px] uppercase tracking-[1.8px] text-text-secondary">
                {t("exercise.filters.label")}
              </Text>
              {hasActiveFilters ? (
                <Pressable
                  onPress={clearAll}
                  accessibilityRole="button"
                  accessibilityLabel={t("exercise.library.clear_filters")}
                  hitSlop={8}
                  className="rounded-full px-2 py-1 active:bg-surface-subtle"
                >
                  <Text className="text-[11px] font-medium uppercase tracking-[1.8px] text-danger">
                    {t("exercise.filters.clear")}
                  </Text>
                </Pressable>
              ) : null}
            </Box>

        {categories.length > 0 ? (
          <FilterChipRow
            label={t("exercise.library.filter_category")}
            allLabel={t("exercise.library.all_categories")}
            options={categories.map((c) => ({ id: c, label: c }))}
            selected={value.category}
            onSelect={(category) =>
              onChange({
                ...value,
                category: category === value.category ? undefined : category,
              })
            }
          />
        ) : null}

        {muscleOptions.length > 0 ? (
          <FilterChipRow
            label={t("exercise.library.filter_muscle_group")}
            allLabel={t("exercise.library.all_muscle_groups")}
            options={muscleOptions.map((o) => ({
              id: String(o.id),
              label: o.label,
            }))}
            selected={
              value.muscleGroupId !== undefined
                ? String(value.muscleGroupId)
                : undefined
            }
            onSelect={(id) =>
              onChange({
                ...value,
                muscleGroupId:
                  id === undefined ||
                  Number(id) === value.muscleGroupId
                    ? undefined
                    : Number(id),
              })
            }
          />
        ) : null}

        {equipmentOptions.length > 0 ? (
          <FilterChipRow
            label={t("exercise.library.filter_equipment")}
            allLabel={t("exercise.library.all_equipment")}
            options={equipmentOptions.map((o) => ({
              id: String(o.id),
              label: o.label,
            }))}
            selected={
              value.equipmentId !== undefined
                ? String(value.equipmentId)
                : undefined
            }
            onSelect={(id) =>
              onChange({
                ...value,
                equipmentId:
                  id === undefined || Number(id) === value.equipmentId
                    ? undefined
                    : Number(id),
              })
            }
          />
        ) : null}

            <Text
              accessibilityLiveRegion="polite"
              className="text-xs text-text-secondary"
            >
              {resultLabel}
            </Text>
          </Box>
        ) : null}
      </Box>
    );
  },
);

interface ChipOption {
  id: string;
  label: string;
}

function FilterChipRow({
  label,
  allLabel,
  options,
  selected,
  onSelect,
}: {
  label: string;
  allLabel: string;
  options: ChipOption[];
  selected?: string;
  onSelect: (id: string | undefined) => void;
}) {
  return (
    <Box className="gap-1.5">
      <Text className="text-[10px] uppercase tracking-[1.8px] text-text-secondary">
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, paddingRight: 4 }}
      >
        <FilterChip
          label={allLabel}
          active={selected === undefined}
          onPress={() => onSelect(undefined)}
        />
        {options.map((option) => (
          <FilterChip
            key={option.id}
            label={option.label}
            active={selected === option.id}
            onPress={() => onSelect(option.id)}
          />
        ))}
      </ScrollView>
    </Box>
  );
}

const FilterChip = React.memo(function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        triggerHaptic();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      hitSlop={4}
    >
      <Badge
        variant={active ? "default" : "outline"}
        className={
          active ? "rounded-full bg-primary" : "rounded-full bg-transparent"
        }
      >
        <BadgeText
          className={
            active
              ? "text-[10px] uppercase tracking-[1.8px] text-primary-foreground"
              : "text-[10px] uppercase tracking-[1.8px] text-text-secondary"
          }
        >
          {label}
        </BadgeText>
      </Badge>
    </Pressable>
  );
});

/**
 * Round filter toggle beside search (44pt target, better-accessibility).
 * Carries its state explicitly (better-interface): a count badge while
 * collapsed with active filters, accent fill while open — the hidden panel
 * is always hinted, never a mystery. Real button with
 * accessibilityState.expanded.
 */
const FilterToggleButton = React.memo(function FilterToggleButton({
  expanded,
  activeCount,
  onPress,
}: {
  expanded: boolean;
  activeCount: number;
  onPress: () => void;
}) {
  const { t } = useI18n();
  const colors = useAppColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("exercise.filters.label")}
      accessibilityState={{ expanded }}
      className={
        expanded
          ? "h-11 w-11 items-center justify-center rounded-full bg-primary active:opacity-80"
          : "h-11 w-11 items-center justify-center rounded-full border border-border bg-card active:bg-surface-subtle"
      }
    >
      <MaterialCommunityIcons
        name="tune-variant"
        size={20}
        color={expanded ? colors.onAccent : colors.text}
      />
      {activeCount > 0 && !expanded ? (
        <Box className="absolute -right-1 -top-1 h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1">
          <Text className="text-[10px] font-semibold leading-none text-primary-foreground">
            {activeCount}
          </Text>
        </Box>
      ) : null}
    </Pressable>
  );
});
