"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ExerciseSet } from "@/types";
import { ExerciseSetFormData } from "@/lib/validations/workout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { useTranslations } from 'next-intl';

// Extended ExerciseSet type with unique ID for stable keys
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
  className
}: ExerciseSetInputProps) {
  const t = useTranslations('workout.form.exercise.sets');

  // Maintain internal state with stable IDs
  const [setsWithIds, setSetsWithIds] = useState<ExerciseSetWithId[]>(() => {
    return (value || []).map((set, index) => ({
      ...set,
      id: `set-${index}`
    }));
  });

  // Sync with external value changes
  useMemo(() => {
    const currentIds = new Set(setsWithIds.map(s => s.id));
    const newSets = (value || []).map((set, index) => {
      // Try to find an existing set with matching properties
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

      // Create new set with stable ID
      return {
        ...set,
        id: `set-${Date.now()}-${index}`
      };
    });

    setSetsWithIds(newSets);
  }, [value]);

  const addSet = () => {
    const newSet: ExerciseSetWithId = {
      weight: 0,
      weightUnit: "kg",
      reps: 1,
      restTime: 60, // Default 1 minute rest
      completed: false,
      id: `set-${Date.now()}`
    };
    const newSetsWithIds = [...setsWithIds, newSet];
    setSetsWithIds(newSetsWithIds);
    // Convert back to ExerciseSet[] for the parent component
    onChange(newSetsWithIds.map(({ id, ...set }) => set));
  };

  const removeSet = (setId: string) => {
    const newSetsWithIds = setsWithIds.filter(set => set.id !== setId);
    setSetsWithIds(newSetsWithIds);
    // Convert back to ExerciseSet[] for the parent component
    onChange(newSetsWithIds.map(({ id, ...set }) => set));
  };

  const updateSet = (setId: string, field: keyof ExerciseSet, newValue: number) => {
    const newSetsWithIds = setsWithIds.map(set =>
      set.id === setId ? { ...set, [field]: newValue } : set
    );
    setSetsWithIds(newSetsWithIds);
    // Convert back to ExerciseSet[] for the parent component
    onChange(newSetsWithIds.map(({ id, ...set }) => set));
  };


  return (
    <div className={cn("space-y-3", className)}>
      <FieldLabel>{t('label')}</FieldLabel>

      {!value || value.length === 0 ? (
        <div className="space-y-3" >
          <div className="text-center py-4 text-sm text-muted-foreground border rounded-md" >
            {t('no_sets')}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSet}
            disabled={disabled}
            className="w-full"

          >
            <Plus className="w-4 h-4 mr-1" />
            {t('add')}
          </Button>
        </div>
      ) : (
        <div className="space-y-2" >
          {setsWithIds.map((set, index) => (
            <div
              key={set.id}
              className="flex flex-wrap items-center gap-2 p-3 border rounded-md bg-background"
            >
              {/* Set Number */}
              <div className="flex items-center gap-1 min-w-[60px]">
                <span className="text-sm font-medium">{t('set_number', { number: index + 1 })}</span>
              </div>

              {/* Weight Input */}
              <div className="flex items-center gap-1 min-w-[80px]">
                <Field>
                  <FieldLabel className="text-xs">{t('weight')}</FieldLabel>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={set.weight}
                    onChange={(e) => updateSet(set.id, "weight", parseFloat(e.target.value) || 0)}
                    disabled={disabled}
                    className="w-16"
                    placeholder="0"
                  />
                </Field>
                <span className="text-sm text-muted-foreground self-end pb-1">{t('weight_unit')}</span>
              </div>

              {/* Reps Input */}
              <div className="flex items-center gap-1 min-w-[70px]">
                <Field>
                  <FieldLabel className="text-xs">{t('reps')}</FieldLabel>
                  <Input
                    type="number"
                    min="1"
                    value={set.reps}
                    onChange={(e) => updateSet(set.id, "reps", parseInt(e.target.value) || 1)}
                    disabled={disabled}
                    className="w-16"
                    placeholder="1"
                  />
                </Field>
              </div>

              {/* Rest Time Input */}
              <div className="flex items-center gap-1 min-w-[90px]">
                <Field>
                  <FieldLabel className="text-xs">{t('rest')}</FieldLabel>
                  <Input
                    type="number"
                    min="0"
                    step="15"
                    value={set.restTime || 0}
                    onChange={(e) => updateSet(set.id, "restTime", parseInt(e.target.value) || 0)}
                    disabled={disabled}
                    className="w-16"
                    placeholder="60"
                  />
                </Field>
                <span className="text-sm text-muted-foreground self-end pb-1">{t('seconds')}</span>
              </div>

              {/* Remove Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeSet(set.id)}
                disabled={disabled}
                className="text-red-600 hover:text-red-700 ml-auto"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {/* Add Set Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSet}
            disabled={disabled}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-1" />
            {t('add')}
          </Button>
        </div>
      )}
    </div>
  );
}
