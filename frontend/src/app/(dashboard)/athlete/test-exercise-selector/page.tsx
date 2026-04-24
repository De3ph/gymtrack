"use client";

import { useState } from "react";
import { ExerciseSelector } from "@/components/features/exercise/ExerciseSelector";
import { ExerciseLibrary } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestExerciseSelectorPage() {
  const [selectedExercise, setSelectedExercise] = useState<ExerciseLibrary | null>(null);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Exercise Selector Test</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Exercise Selector</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ExerciseSelector
            onSelect={(exercise) => setSelectedExercise(exercise)}
            selectedExerciseId={selectedExercise?.exerciseId}
            placeholder="Search for an exercise..."
          />
          
          {selectedExercise && (
            <div className="mt-4 p-4 bg-green-50 border rounded-md">
              <h3 className="font-medium text-green-800">Selected Exercise:</h3>
              <p className="text-green-700">{selectedExercise.name}</p>
              <p className="text-green-700 text-sm">Category: {selectedExercise.category}</p>
              <p className="text-green-700 text-sm">Muscle Group: {selectedExercise.muscleGroup?.description}</p>
              <p className="text-green-700 text-sm">Equipment: {selectedExercise.equipment?.description}</p>
              {selectedExercise.instructions && (
                <p className="text-green-700 text-sm mt-2">Instructions: {selectedExercise.instructions}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
