"use client";

import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ExerciseSet } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface ExerciseSetWithId extends ExerciseSet {
  id: string;
}

/** The numeric fields of a set, as opposed to its weight unit. */
type NumericSetField = "weight" | "reps" | "restTime";

/**
 * How a numeric field is read.
 *
 * The committed number is exactly what was typed: a value the schema rejects
 * (a negative weight, zero reps) has to reach the validator. Repairing it
 * here would swallow the error - the workout would be accepted with a
 * different weight than the one on screen, and the athlete would never learn
 * why it was refused.
 */
interface FieldSpec {
  parse: (raw: string) => number;
  /** The value committed when the field holds no number at all. */
  fallback: number;
}

const FIELD_SPECS: Record<NumericSetField, FieldSpec> = {
  weight: { parse: parseFloat, fallback: 0 },
  reps: { parse: parseInt, fallback: 1 },
  restTime: { parse: parseInt, fallback: 0 },
};

/**
 * The raw text of a field that is being edited.
 *
 * The model is numeric, so an emptied field has no representation: committing
 * a fallback for it would put that fallback back on screen, and the next
 * keystroke would append to it instead of replacing it - typing "5" into a
 * cleared field would end up as "15". The same goes for a half-typed "12.":
 * the committed number is 12, but the text has to stay "12." so the decimal
 * point survives until the next keystroke.
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
interface SetInputState {
  sets: ExerciseSetWithId[];
  drafts: Drafts;
}

const draftKey = (setId: string, field: NumericSetField) => `${setId}:${field}`;

/**
 * Drops the drafts that no longer describe the value behind them.
 *
 * A draft belongs to the number it was written for. When that number changes -
 * the parent swapped the array, or the row is gone - the draft is stale, and
 * keeping it would show a value the model no longer holds.
 */
function dropStaleDrafts(drafts: Drafts, sets: ExerciseSetWithId[]): Drafts {
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

interface ExerciseSetInputProps {
  value: ExerciseSet[];
  onChange: (sets: ExerciseSet[]) => void;
  disabled?: boolean;
  className?: string;
}

export function ExerciseSetInput({
  value,
  onChange,
  disabled = false,
  className,
}: ExerciseSetInputProps) {
  const t = useTranslations("workout.form.exercise.sets");

  const [state, setState] = useState<SetInputState>(() => ({
    sets: (value || []).map((set, index) => ({
      ...set,
      id: `set-${index}`,
    })),
    drafts: {},
  }));

  /**
   * Monotonic counter for the ids of rows added here. A timestamp would do,
   * but two rows added within the same millisecond would collide - and a
   * colliding key makes React reuse the wrong row.
   */
  const nextId = useRef((value || []).length);

  // Sync external value, keeping ids stable so focus survives re-renders
  // (adjusting state during render: react.dev/reference/react/useState#storing-information-from-previous-renders)
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
  const publish = (sets: ExerciseSetWithId[], drafts: Drafts) => {
    setState({ sets, drafts });
    onChange(sets.map(({ id, ...set }) => set));
  };

  const addSet = () => {
    const prevSet = state.sets[state.sets.length - 1];
    const newSet: ExerciseSetWithId = {
      weight: prevSet?.weight ?? 0,
      weightUnit: prevSet?.weightUnit ?? "kg",
      reps: prevSet?.reps ?? 1,
      restTime: prevSet?.restTime ?? 60,
      completed: prevSet?.completed ?? false,
      id: `set-${nextId.current++}`,
    };
    publish([...state.sets, newSet], state.drafts);
  };

  const removeSet = (setId: string) => {
    publish(
      state.sets.filter((set) => set.id !== setId),
      dropDraftsOfSet(state.drafts, setId),
    );
  };

  /**
   * Writes the typed number into the model and keeps the raw text next to it.
   *
   * The text is what the field shows while it is being edited; the number is
   * what the form validates and sends.
   */
  const commitNumber = (setId: string, field: NumericSetField, raw: string) => {
    const spec = FIELD_SPECS[field];
    const parsed = spec.parse(raw);
    const committed = Number.isFinite(parsed) ? parsed : spec.fallback;
    const sets = state.sets.map((set) =>
      set.id === setId ? { ...set, [field]: committed } : set,
    );
    publish(sets, {
      ...state.drafts,
      [draftKey(setId, field)]: { text: raw, committed },
    });
  };

  /** Drops the raw text, so the field shows the committed number again. */
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

  const colLabel =
    "font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground";
  const weightUnit = state.sets[0]?.weightUnit ?? "kg";

  return (
    <div className={cn("border border-border", className)}>
      {state.sets.length > 0 && (
        <div className="grid grid-cols-[3rem_1fr_1fr_1fr_2rem] items-center gap-2 border-b border-border px-3 py-2 sm:grid-cols-[3.5rem_1fr_1fr_1fr_2.25rem]">
          <span className={cn(colLabel, "text-left")}>{t("set")}</span>
          <span className={cn(colLabel, "text-center")}>
            {t("weight")} ({weightUnit})
          </span>
          <span className={cn(colLabel, "text-center")}>{t("reps")}</span>
          <span className={cn(colLabel, "text-center")}>{t("rest")}</span>
          <span />
        </div>
      )}

      {state.sets.length === 0 && (
        <div className="px-3 py-6 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {t("no_sets")}
        </div>
      )}

      <ul className="divide-y divide-border">
        {state.sets.map((set, index) => (
          <li
            key={set.id}
            className="grid grid-cols-[3rem_1fr_1fr_1fr_2rem] items-center gap-2 px-3 py-1.5 sm:grid-cols-[3.5rem_1fr_1fr_1fr_2.25rem]"
          >
            <span className="flex justify-start font-mono text-sm tabular-nums text-muted-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="flex justify-center">
              <Input
                type="number"
                step="0.5"
                min="0"
                value={displayValue(set.id, "weight", set.weight)}
                onChange={(e) =>
                  commitNumber(set.id, "weight", e.target.value)
                }
                onBlur={() => clearDraft(set.id, "weight")}
                disabled={disabled}
                aria-label={t("weight")}
                className="no-spin h-8 w-full max-w-20 text-center font-mono tabular-nums"
                data-testid="set-weight"
              />
            </div>
            <div className="flex justify-center">
              <Input
                type="number"
                min="1"
                value={displayValue(set.id, "reps", set.reps)}
                onChange={(e) =>
                  commitNumber(set.id, "reps", e.target.value)
                }
                onBlur={() => clearDraft(set.id, "reps")}
                disabled={disabled}
                aria-label={t("reps")}
                className="no-spin h-8 w-full max-w-20 text-center font-mono tabular-nums"
                data-testid="set-reps"
              />
            </div>
            <div className="flex justify-center">
              <Input
                type="number"
                min="0"
                step="15"
                value={displayValue(set.id, "restTime", set.restTime ?? 0)}
                onChange={(e) =>
                  commitNumber(set.id, "restTime", e.target.value)
                }
                onBlur={() => clearDraft(set.id, "restTime")}
                disabled={disabled}
                aria-label={t("rest")}
                className="no-spin h-8 w-full max-w-20 text-center font-mono tabular-nums"
                data-testid="set-rest"
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeSet(set.id)}
                disabled={disabled}
                className="h-8 w-8 rounded-none text-muted-foreground hover:text-destructive"
                aria-label={t("remove")}
                data-testid="remove-set"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <div className="border-t border-border">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addSet}
          disabled={disabled}
          className="w-full rounded-none border-0 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-4" aria-hidden="true" /> {t("add")}
        </Button>
      </div>
    </div>
  );
}
