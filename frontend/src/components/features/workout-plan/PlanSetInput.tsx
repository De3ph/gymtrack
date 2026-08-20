"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Weight, Repeat, Timer } from "lucide-react";
import { WorkoutPlanSet } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface PlanSetWithId extends WorkoutPlanSet {
  id: string;
}

interface PlanSetInputProps {
  value: WorkoutPlanSet[];
  onChange: (sets: WorkoutPlanSet[]) => void;
  disabled?: boolean;
  className?: string;
}

export function PlanSetInput({
  value,
  onChange,
  disabled = false,
  className
}: PlanSetInputProps) {
  const t = useTranslations('workout.form.exercise.sets')
  const [setsWithIds, setSetsWithIds] = useState<PlanSetWithId[]>(() => {
    return (value || []).map((set, index) => ({
      ...set,
      id: `set-${index}`
    }));
  });

  // Sync external value changes into internal state.
  // The functional setState returns `prev` when nothing changed, so no cascading renders.
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    const currentIds = new Set(setsWithIds.map(s => s.id));
    const newSets = (value || []).map((set, index) => {
      const existingSet = setsWithIds.find(s =>
        s.weight === set.weight &&
        s.reps === set.reps &&
        s.restTime === set.restTime &&
        !currentIds.has(s.id)
      );
      if (existingSet) {
        currentIds.add(existingSet.id);
        return existingSet;
      }
      return { ...set, id: `set-${Date.now()}-${index}` };
    });
    setSetsWithIds(newSets);
  }, [value]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const addSet = () => {
    const lastSet = setsWithIds[setsWithIds.length - 1];
    const newSet: PlanSetWithId = {
      weight: lastSet ? lastSet.weight : 0,
      weightUnit: lastSet ? lastSet.weightUnit : "kg",
      reps: lastSet ? lastSet.reps : 10,
      restTime: lastSet ? lastSet.restTime : 60,
      id: `set-${Date.now()}`
    };
    const newSetsWithIds = [...setsWithIds, newSet];
    setSetsWithIds(newSetsWithIds);
    onChange(newSetsWithIds.map(({ id, ...set }) => set));
  };

  const removeSet = (setId: string) => {
    const newSetsWithIds = setsWithIds.filter(set => set.id !== setId);
    setSetsWithIds(newSetsWithIds);
    onChange(newSetsWithIds.map(({ id, ...set }) => set));
  };

  const updateSet = (setId: string, field: keyof WorkoutPlanSet, newValue: number | "kg" | "lbs") => {
    const newSetsWithIds = setsWithIds.map(set =>
      set.id === setId ? { ...set, [field]: newValue } : set
    );
    setSetsWithIds(newSetsWithIds);
    onChange(newSetsWithIds.map(({ id, ...set }) => set));
  };

  const colLabel = "flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground";

  return (
    <div className={cn("space-y-2", className)}>
      {setsWithIds.length > 0 && (
        <div className="grid grid-cols-[3rem_1fr_1fr_1fr_2rem] gap-2 px-2 pb-1 sm:grid-cols-[3.5rem_1fr_1fr_1fr_2.25rem]">
          <span className={cn(colLabel, "justify-start")}>{t('label')}</span>
          <span className={cn(colLabel, "justify-center")}>
            <Weight className="size-3" /> {t('weight')}
          </span>
          <span className={cn(colLabel, "justify-center")}>
            <Repeat className="size-3" /> {t('reps')}
          </span>
          <span className={cn(colLabel, "justify-center")}>
            <Timer className="size-3" /> {t('rest')}
          </span>
          <span />
        </div>
      )}

      <div className="space-y-1.5">
        {setsWithIds.map((set, index) => (
          <div
            key={set.id}
            className="group grid grid-cols-[3rem_1fr_1fr_1fr_2rem] items-center gap-2 rounded-lg border bg-background px-2 py-1.5 transition-colors hover:border-primary/40 sm:grid-cols-[3.5rem_1fr_1fr_1fr_2.25rem]"
          >
            <span className="flex justify-start text-sm font-medium tabular-nums text-muted-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="flex justify-center">
              <Input
                type="number" step="0.5" min="0"
                value={set.weight}
                onChange={(e) => updateSet(set.id, "weight", parseFloat(e.target.value) || 0)}
                disabled={disabled}
                className="h-8 w-full max-w-20 text-center tabular-nums" placeholder="0"
              />
            </div>
            <div className="flex justify-center">
              <Input
                type="number" min="1"
                value={set.reps}
                onChange={(e) => updateSet(set.id, "reps", parseInt(e.target.value) || 1)}
                disabled={disabled}
                className="h-8 w-full max-w-20 text-center tabular-nums" placeholder="—"
              />
            </div>
            <div className="flex justify-center">
              <Input
                type="number" min="0" step="15"
                value={set.restTime}
                onChange={(e) => updateSet(set.id, "restTime", parseInt(e.target.value) || 0)}
                disabled={disabled}
                className="h-8 w-full max-w-20 text-center tabular-nums" placeholder="—"
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="button" variant="ghost" size="icon-sm"
                onClick={() => removeSet(set.id)}
                disabled={disabled || setsWithIds.length === 1}
                className="h-8 w-8 text-muted-foreground opacity-60 transition-opacity hover:text-destructive group-hover:opacity-100"
                aria-label={t('remove')}
              >
                <Trash2 className="size-4" />
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
        <Plus className="size-4 mr-1" /> {t('add')}
      </Button>
    </div>
  );
}
