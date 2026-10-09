"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { Equipment, MuscleGroup } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useExerciseLookupLabels } from "./exercise-labels";

const ALL = "all";

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
  className?: string;
}

/** A single label/description pair for one select, shared by all three. */
interface SelectItemOption {
  value: string;
  label: string;
}

const ITEM_CLASS = "rounded-none font-mono text-[10px] uppercase tracking-[0.18em]";

const LABEL_CLASS =
  "block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground";

/**
 * Turns a lookup row into a select option, or returns null if it cannot.
 *
 * Every field on these generated types is optional — swagger 2.x emits no
 * `required` list, so `id`, `code`, and `description` are all `T | undefined`
 * even though the database guarantees them. Without this guard a malformed row
 * yields the option value `"undefined"`, and the option then silently filters
 * to nothing. The label comes from the caller so it can be localised.
 */
function toOption(
  row: { id?: number; code?: string; description?: string },
  label: string,
): SelectItemOption | null {
  if (typeof row.id !== "number") return null;
  return { value: String(row.id), label };
}

/**
 * Filter bar for the exercise library.
 *
 * Filters run entirely in the browser against the server-fetched catalog. The
 * alternative — a request per filter change — costs a round trip per keystroke
 * and cannot filter by category at all, since the backend's search endpoint
 * accepts only muscle group and equipment.
 */
export function ExerciseLibraryFilters({
  value,
  categories,
  muscleGroups,
  equipment,
  resultCount,
  totalCount,
  onChange,
  className,
}: ExerciseLibraryFiltersProps) {
  const t = useTranslations("exercise.library");
  // Option labels are localised from the stored `code`, not the English-only
  // `description`, so the same catalog reads correctly in every locale.
  const { muscleGroupLabel, equipmentLabel } = useExerciseLookupLabels();

  const hasActiveFilters =
    value.query !== "" ||
    value.muscleGroupId !== undefined ||
    value.equipmentId !== undefined ||
    value.category !== undefined;

  const clearAll = () => onChange({ query: "" });

  // The `items` arrays are not decorative: Base UI's <Select.Value> renders the
  // trigger label by looking the selected value up in `items`. The options
  // themselves live inside a portal that only exists while the popup is open, so
  // without this the trigger has nothing to resolve and falls back to printing
  // the raw value — "3" instead of "Shoulders".
  const categoryItems = useMemo<SelectItemOption[]>(
    () => [
      { value: ALL, label: t("all_categories") },
      ...categories.map((category) => ({ value: category, label: category })),
    ],
    [categories, t],
  );

  const muscleGroupItems = useMemo<SelectItemOption[]>(
    () => [
      { value: ALL, label: t("all_muscle_groups") },
      ...muscleGroups
        .map((group) => toOption(group, muscleGroupLabel(group)))
        .filter((option): option is SelectItemOption => option !== null),
    ],
    [muscleGroups, muscleGroupLabel, t],
  );

  const equipmentItems = useMemo<SelectItemOption[]>(
    () => [
      { value: ALL, label: t("all_equipment") },
      ...equipment
        .map((item) => toOption(item, equipmentLabel(item)))
        .filter((option): option is SelectItemOption => option !== null),
    ],
    [equipment, equipmentLabel, t],
  );

  const resultLabel = useMemo(
    () =>
      resultCount === totalCount
        ? t("results_total", { count: totalCount })
        : t("results_filtered", { count: resultCount, total: totalCount }),
    [resultCount, totalCount, t],
  );

  return (
    <div className={cn("space-y-4 border border-border px-4 py-4", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="flex-1 space-y-1.5">
          <label htmlFor="exercise-library-search" className={LABEL_CLASS}>
            {t("filter_search")}
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="exercise-library-search"
              type="search"
              value={value.query}
              onChange={(event) => onChange({ ...value, query: event.target.value })}
              placeholder={t("search_placeholder")}
              className="rounded-none pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FilterSelect
            id="exercise-library-category"
            label={t("filter_category")}
            items={categoryItems}
            value={value.category ?? ALL}
            onValueChange={(next) =>
              onChange({
                ...value,
                category: !next || next === ALL ? undefined : next,
              })
            }
          />

          <FilterSelect
            id="exercise-library-muscle-group"
            label={t("filter_muscle_group")}
            items={muscleGroupItems}
            value={value.muscleGroupId ? String(value.muscleGroupId) : ALL}
            onValueChange={(next) =>
              onChange({
                ...value,
                muscleGroupId: !next || next === ALL ? undefined : Number(next),
              })
            }
          />

          <FilterSelect
            id="exercise-library-equipment"
            label={t("filter_equipment")}
            items={equipmentItems}
            value={value.equipmentId ? String(value.equipmentId) : ALL}
            onValueChange={(next) =>
              onChange({
                ...value,
                equipmentId: !next || next === ALL ? undefined : Number(next),
              })
            }
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <p
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
          aria-live="polite"
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {resultLabel}
        </p>

        {hasActiveFilters && (
          // Outlined rather than ghost: a ghost button sitting next to the
          // result count reads as disabled chrome, and 10px muted text was too
          // small to scan as an action. 11px plus a border makes it
          // unambiguously clickable without changing the design language.
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearAll}
            className="rounded-none border-border font-mono text-[11px] uppercase tracking-[0.18em] text-foreground hover:bg-muted"
          >
            <X className="size-4" aria-hidden="true" />
            {t("clear_filters")}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * One labelled select, wrapping both in a real DOM element.
 *
 * The wrapper is load-bearing, not styling. `Select.Root` renders no element of
 * its own — it is only a context provider — so anything passed to it is hoisted
 * into the parent as a direct child. Inside a `grid-cols-3`, three selects
 * contributed six in-flow children (label + trigger each), which the grid laid
 * out row-wise as [catLabel, catTrigger, muscleLabel] / [muscleTrigger,
 * equipLabel, equipTrigger]: labels ended up stranded beside the wrong control
 * and the search box was pushed off-canvas. One wrapper per select restores the
 * one-cell-per-control relationship.
 */
function FilterSelect({
  id,
  label,
  items,
  value,
  onValueChange,
}: {
  id: string;
  label: string;
  items: SelectItemOption[];
  value: string;
  // Base UI's signature is `(value: string | null, eventDetails) => void`; the
  // null case is a real possibility (dismissal), so callers narrow it rather
  // than assuming a string.
  onValueChange: (value: string | null) => void;
}) {
  const labelId = `${id}-label`;

  return (
    <div className="space-y-1.5">
      <span id={labelId} className={LABEL_CLASS}>
        {label}
      </span>
      <Select items={items} value={value} onValueChange={onValueChange}>
        <SelectTrigger
          aria-labelledby={labelId}
          className="w-full rounded-none shadow-none"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-none border border-border shadow-none ring-0">
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value} className={ITEM_CLASS}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}