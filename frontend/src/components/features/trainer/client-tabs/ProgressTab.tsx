"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { ClientProgressCharts } from "../ClientProgressCharts";
import { WorkoutStats, MealStats } from "@/lib/api/api-types"

interface ProgressTabProps {
  workoutStats: WorkoutStats | null
  mealStats: MealStats | null
}

export function ProgressTab({ workoutStats, mealStats }: ProgressTabProps) {
  if (workoutStats && mealStats) {
    return <ClientProgressCharts workoutStats={workoutStats} mealStats={mealStats} />;
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </CardContent>
    </Card>
  );
}
