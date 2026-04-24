"use client";

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
  const [showFullInstructions, setShowFullInstructions] = useState(false);

  const handleSelect = () => {
    onSelect?.(exercise);
  };

  const toggleInstructions = () => {
    setShowFullInstructions(!showFullInstructions);
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg leading-tight">
            {exercise.name}
          </CardTitle>
          {onSelect && (
            <Button 
              size="sm" 
              onClick={handleSelect}
              className="ml-2"
            >
              Select
            </Button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 mt-2">
          {exercise.muscleGroup && (
            <MuscleGroupBadge muscleGroup={exercise.muscleGroup} variant="small" />
          )}
          {exercise.equipment && (
            <EquipmentBadge equipment={exercise.equipment} variant="small" />
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="text-sm text-gray-600">
            Category: <span className="font-medium capitalize">{exercise.category}</span>
          </div>
          
          {exercise.instructions && showInstructions && (
            <div className="text-sm text-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <Info className="w-4 h-4" />
                <span className="font-medium">Instructions:</span>
              </div>
              <div className="bg-gray-50 p-2 rounded text-sm">
                {showFullInstructions ? exercise.instructions : `${exercise.instructions.slice(0, 100)}...`}
                {exercise.instructions.length > 100 && (
                  <button
                    onClick={toggleInstructions}
                    className="text-blue-600 hover:text-blue-800 ml-1 underline"
                  >
                    {showFullInstructions ? "Show less" : "Show more"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
