"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClientProgressCharts } from "../ClientProgressCharts";
import { WorkoutStats, MealStats } from "@/types";

interface ProgressTabProps {
  workoutStats: WorkoutStats | null;
  mealStats: MealStats | null;
}

export function ProgressTab({ workoutStats, mealStats }: ProgressTabProps) {
  if (workoutStats && mealStats) {
    return (
      <ClientProgressCharts workoutStats={workoutStats} mealStats={mealStats} />
    );
  }

  return (
    <div className={cn("rounded-none border border-border", "flex items-center justify-center py-12")}>
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
    </div>
  );
}
