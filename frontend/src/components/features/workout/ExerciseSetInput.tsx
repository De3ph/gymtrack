"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Weight, Repeat, Timer } from "lucide-react";
import { ExerciseSet } from "@/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface ExerciseSetWithId extends ExerciseSet {
  id: string;
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

  const [setsWithIds, setSetsWithIds] = useState<ExerciseSetWithId[]>(() => {
    return (value || []).map((set, index) => ({
      ...set,
      id: `set-${index}`,
    }));
  });

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const newVal = value ?? [];
    setSetsWithIds((prev) => {
      const updated = newVal.map((set, i) => {
        const existing = i < prev.length ? prev[i] : null;
        return existing
          ? { ...set, id: existing.id }
          : { ...set, id: `set-${Date.now()}-${i}` };
      });
      const changed = updated.some(
        (s, i) =>
          !prev[i] ||
          prev[i].weight !== s.weight ||
          prev[i].reps !== s.reps ||
          prev[i].restTime !== s.restTime,
      );
      return changed ? updated : prev;
    });
  }, [value]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const addSet = () => {
    const prevSet = setsWithIds[setsWithIds.length - 1];
    const newSet: ExerciseSetWithId = {
      weight: prevSet?.weight ?? 0,
      weightUnit: prevSet?.weightUnit ?? "kg",
      reps: prevSet?.reps ?? 1,
      restTime: prevSet?.restTime ?? 60,
      completed: prevSet?.completed ?? false,
      id: `set-${Date.now()}`,
    };
    const newSetsWithIds = [...setsWithIds, newSet];
    setSetsWithIds(newSetsWithIds);
    onChange(newSetsWithIds.map(({ id, ...set }) => set));
  };

  const removeSet = (setId: string) => {
    const newSetsWithIds = setsWithIds.filter((set) => set.id !== setId);
    setSetsWithIds(newSetsWithIds);
    onChange(newSetsWithIds.map(({ id, ...set }) => set));
  };

  const updateSet = (
    setId: string,
    field: keyof ExerciseSet,
    newValue: number,
  ) => {
    const newSetsWithIds = setsWithIds.map((set) =>
      set.id === setId ? { ...set, [field]: newValue } : set,
    );
    setSetsWithIds(newSetsWithIds);
    onChange(newSetsWithIds.map(({ id, ...set }) => set));
  };

  const colLabel =
    "flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground";

  return (
    <div className={cn("border border-border", className)}>
      {setsWithIds.length > 0 && (
          <div className="grid grid-cols-[3rem_1fr_1fr_1fr_2rem] items-center gap-2 border-b border-border px-3 py-2 sm:grid-cols-[3.5rem_1fr_1fr_1fr_2.25rem]">
            <span className={cn(colLabel, "justify-start")}>
              {t("label")}
            </span>
            <span className={cn(colLabel, "justify-center")}>
              <Weight className="size-4" aria-hidden="true" /> {t("weight")}
            </span>
            <span className={cn(colLabel, "justify-center")}>
              <Repeat className="size-4" aria-hidden="true" /> {t("reps")}
            </span>
            <span className={cn(colLabel, "justify-center")}>
              <Timer className="size-4" aria-hidden="true" /> {t("rest")}
            </span>
            <span />
          </div>
      )}

      <ul className="divide-y divide-border">
        {setsWithIds.map((set, index) => (
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
                value={set.weight}
                onChange={(e) =>
                  updateSet(
                    set.id,
                    "weight",
                    parseFloat(e.target.value) || 0,
                  )
                }
                disabled={disabled}
                className="no-spin h-8 w-full max-w-20 text-center font-mono tabular-nums"
                placeholder="0"
                data-testid="set-weight"
              />
            </div>
            <div className="flex justify-center">
              <Input
                type="number"
                min="1"
                value={set.reps}
                onChange={(e) =>
                  updateSet(set.id, "reps", parseInt(e.target.value) || 1)
                }
                disabled={disabled}
                className="no-spin h-8 w-full max-w-20 text-center font-mono tabular-nums"
                placeholder="0"
                data-testid="set-reps"
              />
            </div>
            <div className="flex justify-center">
              <Input
                type="number"
                min="0"
                step="15"
                value={set.restTime || 0}
                onChange={(e) =>
                  updateSet(
                    set.id,
                    "restTime",
                    parseInt(e.target.value) || 0,
                  )
                }
                disabled={disabled}
                className="no-spin h-8 w-full max-w-20 text-center font-mono tabular-nums"
                placeholder="0"
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
                <Trash2 className="size-5" aria-hidden="true" />
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
          <Plus className="size-5" aria-hidden="true" /> {t("add")}
        </Button>
      </div>
    </div>
  );
}
