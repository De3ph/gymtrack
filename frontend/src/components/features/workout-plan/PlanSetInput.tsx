"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { WorkoutPlanSet } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
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

  useMemo(() => {
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

  const addSet = () => {
    const newSet: PlanSetWithId = {
      weight: 0,
      weightUnit: "kg",
      reps: 10,
      restTime: 60,
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

  return (
    <div className={cn("space-y-2", className)}>
      {setsWithIds.map((set, index) => (
        <div key={set.id} className="flex flex-wrap items-center gap-2 p-3 border rounded-md bg-background">
          <div className="flex items-center gap-1 min-w-[60px]">
            <span className="text-sm font-medium">{t('set_number', { number: index + 1 })}</span>
          </div>
          <div className="flex items-center gap-1 min-w-[80px]">
            <Field>
              <FieldLabel className="text-xs">{t('weight')}</FieldLabel>
              <Input
                type="number" step="0.5" min="0"
                value={set.weight}
                onChange={(e) => updateSet(set.id, "weight", parseFloat(e.target.value) || 0)}
                disabled={disabled}
                className="w-16" placeholder="0"
              />
            </Field>
          </div>
          <div className="flex items-center gap-1 min-w-[70px]">
            <Field>
              <FieldLabel className="text-xs">{t('reps')}</FieldLabel>
              <Input
                type="number" min="1"
                value={set.reps}
                onChange={(e) => updateSet(set.id, "reps", parseInt(e.target.value) || 1)}
                disabled={disabled}
                className="w-16" placeholder={t('reps')}
              />
            </Field>
          </div>
          <div className="flex items-center gap-1 min-w-[90px]">
            <Field>
              <FieldLabel className="text-xs">{t('rest')}</FieldLabel>
              <Input
                type="number" min="0" step="15"
                value={set.restTime}
                onChange={(e) => updateSet(set.id, "restTime", parseInt(e.target.value) || 0)}
                disabled={disabled}
                className="w-16" placeholder={t('rest')}
              />
            </Field>
          </div>
          <Button
            type="button" variant="outline" size="sm"
            onClick={() => removeSet(set.id)}
            disabled={disabled}
            className="text-red-600 hover:text-red-700 ml-auto"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button" variant="outline" size="sm"
        onClick={addSet}
        disabled={disabled}
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-1" /> {t('add')}
      </Button>
    </div>
  );
}
