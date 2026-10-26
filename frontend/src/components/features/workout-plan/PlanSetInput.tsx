"use client";

import { useRef, useState } from "react";
import { Plus, Trash2, Weight, Repeat, Timer } from "lucide-react";
import { SetType, WorkoutPlanSet } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { SetTypeSelect } from "../workout/SetTypeSelect";

interface PlanSetWithId extends WorkoutPlanSet {
  id: string;
}

interface PlanSetInputProps {
  value: WorkoutPlanSet[];
  onChange: (sets: WorkoutPlanSet[]) => void;
  disabled?: boolean;
  className?: string;
}

/** The numeric fields of a set, as opposed to its weight unit. */
type NumericSetField = "weight" | "reps" | "restTime";

/**
 * How a numeric field is read and bounded.
 *
 * The backend stores the value as it arrives, so a value below `min` has to be
 * clamped here: the input's `min` attribute only constrains native form
 * submission, and this component is also used outside a form.
 */
interface FieldSpec {
  parse: (raw: string) => number;
  /** The value committed when the field holds no number. */
  fallback: number;
  /** The smallest value the field accepts. */
  min: number;
}

const FIELD_SPECS: Record<NumericSetField, FieldSpec> = {
  weight: { parse: parseFloat, fallback: 0, min: 0 },
  reps: { parse: parseInt, fallback: 1, min: 1 },
  restTime: { parse: parseInt, fallback: 0, min: 0 },
};

/**
 * The raw text of a field that is being edited.
 *
 * The model is numeric, so an emptied field has no representation: committing
 * a fallback for it would put that fallback back on screen, and the next
 * keystroke would append to it instead of replacing it - typing "5" into a
 * cleared field would end up as "15". Keeping the raw text lets the field
 * stay empty while it is being edited; the number is committed next to it.
 */
interface Draft {
  /** The text in the field. */
  text: string;
  /** The committed value the text belongs to. */
  committed: number;
}

type Drafts = Record<string, Draft>;

/**
 * The rows and their drafts.
 *
 * Both live in one state because a draft only means something next to the
 * row it was typed for: splitting them would let the two drift apart.
 */
interface PlanSetState {
  sets: PlanSetWithId[];
  drafts: Drafts;
}

const draftKey = (setId: string, field: NumericSetField) => `${setId}:${field}`;

/**
 * The text to keep in the field.
 *
 * Text that holds no number is kept as typed, so a half-typed "40." survives
 * the keystroke. Text below the field's minimum is replaced by the minimum,
 * because there is no valid value below it.
 */
function draftText(raw: string, spec: FieldSpec): string {
  if (raw === "") return "";
  const parsed = spec.parse(raw);
  if (!Number.isFinite(parsed)) return raw;
  return parsed < spec.min ? String(spec.min) : raw;
}

/**
 * Drops the drafts that no longer describe the value behind them.
 *
 * A draft belongs to the number it was written for. When that number changes -
 * the parent swapped the array, or the row is gone - the draft is stale, and
 * keeping it would show a value the model no longer holds.
 */
function dropStaleDrafts(drafts: Drafts, sets: PlanSetWithId[]): Drafts {
  const rows = new Map(sets.map((set) => [set.id, set]));
  const kept = Object.entries(drafts).filter(([key, draft]) => {
    const [setId, field] = key.split(":") as [string, NumericSetField];
    const set = rows.get(setId);
    return set !== undefined && set[field] === draft.committed;
  });
  return kept.length === Object.keys(drafts).length
    ? drafts
    : Object.fromEntries(kept);
}

/** Drops the drafts of a single row, so a later row cannot inherit them. */
function dropDraftsOfSet(drafts: Drafts, setId: string): Drafts {
  const kept = Object.entries(drafts).filter(
    ([key]) => !key.startsWith(`${setId}:`),
  );
  return kept.length === Object.keys(drafts).length
    ? drafts
    : Object.fromEntries(kept);
}

export function PlanSetInput({
  value,
  onChange,
  disabled = false,
  className
}: PlanSetInputProps) {
  const t = useTranslations('workout.form.exercise.sets')
  const [state, setState] = useState<PlanSetState>(() => ({
    sets: (value || []).map((set, index) => ({
      ...set,
      id: `set-${index}`
    })),
    drafts: {},
  }));

  // Monotonic counter for the ids of rows added here. A timestamp would do,
  // but two rows added within the same millisecond would collide.
  const nextId = useRef((value || []).length);

  // Sync the external value into state, preserving ids by index so keys (and
  // focus) stay stable. Adjusting state during render is React's documented
  // alternative to a setState-in-effect:
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    setState((prev) => {
      const sets = (value || []).map((set, i) => ({
        ...set,
        id: prev.sets[i]?.id ?? `set-${i}-ext`,
      }));
      return { sets, drafts: dropStaleDrafts(prev.drafts, sets) };
    });
  }

  /** Publishes the rows to the parent, dropping the internal ids on the way. */
  const publish = (sets: PlanSetWithId[], drafts: Drafts) => {
    setState({ sets, drafts });
    onChange(sets.map(({ id, ...set }) => set));
  };

  const addSet = () => {
    const lastSet = state.sets[state.sets.length - 1];
    const newSet: PlanSetWithId = {
      setType: lastSet?.setType ?? "working",
      weight: lastSet ? lastSet.weight : 0,
      weightUnit: lastSet ? lastSet.weightUnit : "kg",
      reps: lastSet ? lastSet.reps : 10,
      restTime: lastSet ? lastSet.restTime : 60,
      id: `set-${nextId.current++}`,
    };
    publish([...state.sets, newSet], state.drafts);
  };

  const changeSetType = (setId: string, setType: SetType) => {
    publish(
      state.sets.map((set) => (set.id === setId ? { ...set, setType } : set)),
      state.drafts,
    );
  };

  const removeSet = (setId: string) => {
    publish(
      state.sets.filter(set => set.id !== setId),
      dropDraftsOfSet(state.drafts, setId),
    );
  };

  const commitNumber = (setId: string, field: NumericSetField, raw: string) => {
    const spec = FIELD_SPECS[field];
    const parsed = spec.parse(raw);
    const committed = Number.isFinite(parsed)
      ? Math.max(spec.min, parsed)
      : spec.fallback;
    const sets = state.sets.map(set =>
      set.id === setId ? { ...set, [field]: committed } : set
    );
    const drafts = {
      ...state.drafts,
      [draftKey(setId, field)]: {
        text: draftText(raw, spec),
        committed,
      },
    };
    publish(sets, drafts);
  };

  const clearDraft = (setId: string, field: NumericSetField) => {
    setState((prev) => {
      const key = draftKey(setId, field);
      if (!(key in prev.drafts)) return prev;
      const drafts = { ...prev.drafts };
      delete drafts[key];
      return { ...prev, drafts };
    });
  };

  /** The number to show, preferring the raw text while the field is edited. */
  const displayValue = (
    setId: string,
    field: NumericSetField,
    fallback: number,
  ) => state.drafts[draftKey(setId, field)]?.text ?? String(fallback);

  const colLabel = "flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

  return (
    <div className={cn("space-y-2", className)}>
      {state.sets.length > 0 && (
        <div className="grid grid-cols-6 gap-2 px-2 pb-1 sm:grid-cols-[3.5rem_minmax(6rem,1.2fr)_1fr_1fr_1fr_2.25rem]">
          <span className={cn(colLabel, "order-1 justify-start")}>{t('label')}</span>
          <span className={cn(colLabel, "order-2 col-span-4 justify-start sm:col-span-1 sm:justify-center")}>
            {t('type')}
          </span>
          <span className={cn(colLabel, "order-4 col-span-2 justify-center sm:order-3 sm:col-span-1")}>
            <Weight className="size-4" /> {t('weight')}
          </span>
          <span className={cn(colLabel, "order-5 col-span-2 justify-center sm:order-4 sm:col-span-1")}>
            <Repeat className="size-4" /> {t('reps')}
          </span>
          <span className={cn(colLabel, "order-6 col-span-2 justify-center sm:order-5 sm:col-span-1")}>
            <Timer className="size-4" /> {t('rest')}
          </span>
        </div>
      )}

      <div className="space-y-1.5">
        {state.sets.map((set, index) => (
          <div
            key={set.id}
            className="group grid grid-cols-6 items-center gap-4 rounded-lg border bg-background p-2 transition-colors hover:border-primary/40 sm:grid-cols-[3.5rem_minmax(6rem,1.2fr)_1fr_1fr_1fr_2.25rem]"
          >
            <span className="order-1 flex justify-start text-sm font-semibold tabular-nums text-muted-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="order-2 col-span-4 sm:order-2 sm:col-span-1">
              <SetTypeSelect
                value={set.setType}
                onChange={(type) => changeSetType(set.id, type)}
                disabled={disabled}
              />
            </div>
            <div className="order-4 col-span-2 flex justify-center sm:order-3 sm:col-span-1">
              <Input
                type="number" step="0.5" min={FIELD_SPECS.weight.min}
                value={displayValue(set.id, "weight", set.weight)}
                onChange={(e) => commitNumber(set.id, "weight", e.target.value)}
                onBlur={() => clearDraft(set.id, "weight")}
                disabled={disabled}
                aria-label={t('weight')}
                className="h-8 w-full max-w-20 text-center tabular-nums" placeholder="0"
              />
            </div>
            <div className="order-5 col-span-2 flex justify-center sm:order-4 sm:col-span-1">
              <Input
                type="number" min={FIELD_SPECS.reps.min}
                value={displayValue(set.id, "reps", set.reps)}
                onChange={(e) => commitNumber(set.id, "reps", e.target.value)}
                onBlur={() => clearDraft(set.id, "reps")}
                disabled={disabled}
                aria-label={t('reps')}
                className="h-8 w-full max-w-20 text-center tabular-nums" placeholder="—"
              />
            </div>
            <div className="order-6 col-span-2 flex justify-center sm:order-5 sm:col-span-1">
              <Input
                type="number" min={FIELD_SPECS.restTime.min} step="15"
                value={displayValue(set.id, "restTime", set.restTime)}
                onChange={(e) => commitNumber(set.id, "restTime", e.target.value)}
                onBlur={() => clearDraft(set.id, "restTime")}
                disabled={disabled}
                aria-label={t('rest')}
                className="h-8 w-full max-w-20 text-center tabular-nums" placeholder="—"
              />
            </div>
            <div className="order-3 col-span-1 flex justify-end sm:order-6 sm:col-span-1">
              <Button
                type="button" variant="ghost" size="icon-sm"
                onClick={() => removeSet(set.id)}
                disabled={disabled || state.sets.length === 1}
                className="h-8 w-8 text-muted-foreground opacity-60 transition-opacity hover:text-destructive group-hover:opacity-100"
                aria-label={t('remove')}
              >
                <Trash2 className="size-5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button" variant="outline" size="sm"
        onClick={addSet}
        disabled={disabled}
        className="w-full border-dashed text-muted-foreground hover:border-primary/50 hover:text-primary"
      >
        <Plus className="size-5 mr-1" /> {t('add')}
      </Button>
    </div>
  );
}
