"use client";

import { useTranslations } from "next-intl"
import { ExerciseLibrary } from "@/types";
import { MuscleGroupBadge } from "./MuscleGroupBadge";
import { EquipmentBadge } from "./EquipmentBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
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
  className
}: ExerciseCardProps) {
  const t = useTranslations("exercise")
  const [showFullInstructions, setShowFullInstructions] = useState(false);

  const handleSelect = () => {
    onSelect?.(exercise);
  };

  const toggleInstructions = () => {
    setShowFullInstructions(!showFullInstructions);
  };

  return (
    <Card className={className}>
      <CardHeader className='pb-3'>
        <div className='flex items-start justify-between'>
          <CardTitle className='text-lg leading-tight'>
            {exercise.name}
          </CardTitle>
          {onSelect && (
            <Button size='sm' onClick={handleSelect} className='ml-2'>
              {t("card.select")}
            </Button>
          )}
        </div>

        <div className='flex flex-wrap gap-2 mt-2'>
          {exercise.muscleGroup && (
            <MuscleGroupBadge
              muscleGroup={exercise.muscleGroup}
              variant='small'
            />
          )}
          {exercise.equipment && (
            <EquipmentBadge equipment={exercise.equipment} variant='small' />
          )}
        </div>
      </CardHeader>

      <CardContent className='pt-0'>
        <div className='space-y-2'>
          <div className='text-sm text-muted-foreground'>
            {t("card.category")}:{" "}
            <span className='font-medium capitalize'>{exercise.category}</span>
          </div>

          {exercise.instructions && showInstructions && (
            <div className='text-sm text-foreground'>
              <div className='flex items-center gap-2 mb-1'>
                <Info className='w-4 h-4' />
                <span className='font-medium'>{t("card.instructions")}:</span>
              </div>
              <div className='bg-muted p-2 rounded text-sm'>
                {showFullInstructions
                  ? exercise.instructions
                  : `${exercise.instructions.slice(0, 100)}...`}
                {exercise.instructions.length > 100 && (
                  <button
                    onClick={toggleInstructions}
                    className='text-primary hover:text-primary/80 ml-1 underline'
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
      </CardContent>
    </Card>
  )
}
