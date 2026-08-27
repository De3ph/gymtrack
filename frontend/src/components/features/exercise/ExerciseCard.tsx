"use client";

import { useTranslations } from "next-intl";
import { ExerciseLibrary } from "@/types";
import { MuscleGroupBadge } from "./MuscleGroupBadge";
import { EquipmentBadge } from "./EquipmentBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ExerciseCardProps {
  exercise: ExerciseLibrary;
  onSelect?: (exercise: ExerciseLibrary) => void;
  showInstructions?: boolean;
  className?: string;
}

export function ExerciseCard({
  exercise,
  onSelect,
  showInstructions = false,
  className,
}: ExerciseCardProps) {
  const t = useTranslations("exercise");
  const [showFullInstructions, setShowFullInstructions] = useState(false);

  const handleSelect = () => {
    onSelect?.(exercise);
  };

  const toggleInstructions = () => {
    setShowFullInstructions((v) => !v);
  };

  const hasInstructions = Boolean(exercise.instructions) && showInstructions;
  const instructionsTooLong = (exercise.instructions?.length ?? 0) > 100;

  return (
    <div className={cn("flex flex-col border border-border", className)}>
      <header className="flex items-start justify-between gap-3 border-b border-border px-6 py-4">
        <h3 className="text-base font-semibold leading-tight text-foreground">
          {exercise.name}
        </h3>
        {onSelect && (
          <Button
            size="sm"
            onClick={handleSelect}
            className="rounded-none font-mono text-[10px] uppercase tracking-[0.18em]"
          >
            {t("card.select")}
          </Button>
        )}
      </header>

      {(exercise.muscleGroup || exercise.equipment) && (
        <div className="flex flex-wrap gap-1.5 border-b border-border px-6 py-3">
          {exercise.muscleGroup && (
            <MuscleGroupBadge
              muscleGroup={exercise.muscleGroup}
              variant="small"
            />
          )}
          {exercise.equipment && (
            <EquipmentBadge equipment={exercise.equipment} variant="small" />
          )}
        </div>
      )}

      <div className="space-y-2 px-6 py-4 text-sm">
        <div className="text-muted-foreground">
          {t("card.category")}:{" "}
          <span className="font-semibold text-foreground capitalize">
            {exercise.category}
          </span>
        </div>

        {hasInstructions && (
          <div className="text-foreground">
            <div className="mb-1 flex items-center gap-2 font-semibold">
              <Info className="size-5" aria-hidden="true" />
              <span>{t("card.instructions")}:</span>
            </div>
            <div className="border border-border p-3 text-sm leading-6 text-muted-foreground">
              {showFullInstructions
                ? exercise.instructions
                : `${exercise.instructions!.slice(0, 100)}...`}
              {instructionsTooLong && (
                <button
                  type="button"
                  onClick={toggleInstructions}
                  className={cn(
                    buttonVariants({ variant: "link", size: "sm" }),
                    "ml-1 h-auto rounded-none p-0 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground underline-offset-4 hover:no-underline",
                  )}
                >
                  {showFullInstructions
                    ? t("card.show_less")
                    : t("card.show_more")}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
