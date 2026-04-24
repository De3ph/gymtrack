"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { ExerciseSet } from "@/types";
import { ExerciseSetFormData } from "@/lib/validations/workout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

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
  const addSet = () => {
    const newSet: ExerciseSet = {
      weight: 0,
      weightUnit: "kg",
      reps: 1,
      restTime: 60, // Default 1 minute rest
      completed: false,
    };
    onChange([...(value || []), newSet]);
  };

  const removeSet = (index: number) => {
    const newSets = (value || []).filter((_, i) => i !== index);
    onChange(newSets);
  };

  const updateSet = (index: number, field: keyof ExerciseSet, newValue: number) => {
    const currentSets = value || [];
    const newSets = [...currentSets];
    newSets[index] = { ...newSets[index], [field]: newValue };
    onChange(newSets);
  };

  const moveSet = (index: number, direction: "up" | "down") => {
    const currentSets = value || [];
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === currentSets.length - 1)
    ) {
      return;
    }

    const newSets = [...currentSets];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    // Swap sets
    [newSets[index], newSets[targetIndex]] = [newSets[targetIndex], newSets[index]];
    onChange(newSets);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <FieldLabel>Sets</FieldLabel>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addSet}
          disabled={disabled}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Set
        </Button>
      </div>

      {!value || value.length === 0 ? (
        <div className="text-center py-4 text-sm text-muted-foreground border rounded-md">
          No sets added. Click "Add Set" to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {(value || []).map((set, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-3 border rounded-md bg-background"
            >
              {/* Set Number */}
              <div className="flex items-center gap-1 min-w-[60px]">
                <span className="text-sm font-medium">Set {index + 1}</span>
                <div className="flex flex-col">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0"
                    onClick={() => moveSet(index, "up")}
                    disabled={disabled || index === 0}
                  >
                    <ChevronUp className="w-3 h-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0"
                    onClick={() => moveSet(index, "down")}
                    disabled={disabled || index === value.length - 1}
                  >
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Weight Input */}
              <div className="flex items-center gap-1 flex-1">
                <Field>
                  <FieldLabel className="text-xs">Weight</FieldLabel>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={set.weight}
                    onChange={(e) => updateSet(index, "weight", parseFloat(e.target.value) || 0)}
                    disabled={disabled}
                    className="w-20"
                    placeholder="0"
                  />
                </Field>
                <span className="text-sm text-muted-foreground self-end pb-1">kg</span>
              </div>

              {/* Reps Input */}
              <div className="flex items-center gap-1 flex-1">
                <Field>
                  <FieldLabel className="text-xs">Reps</FieldLabel>
                  <Input
                    type="number"
                    min="1"
                    value={set.reps}
                    onChange={(e) => updateSet(index, "reps", parseInt(e.target.value) || 1)}
                    disabled={disabled}
                    className="w-20"
                    placeholder="1"
                  />
                </Field>
              </div>

              {/* Rest Time Input */}
              <div className="flex items-center gap-1 flex-1">
                <Field>
                  <FieldLabel className="text-xs">Rest</FieldLabel>
                  <Input
                    type="number"
                    min="0"
                    step="15"
                    value={set.restTime || 0}
                    onChange={(e) => updateSet(index, "restTime", parseInt(e.target.value) || 0)}
                    disabled={disabled}
                    className="w-20"
                    placeholder="60"
                  />
                </Field>
                <span className="text-sm text-muted-foreground self-end pb-1">sec</span>
              </div>

              {/* Remove Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeSet(index)}
                disabled={disabled}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
