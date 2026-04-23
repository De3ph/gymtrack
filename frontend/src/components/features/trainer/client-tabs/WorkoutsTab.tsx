"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkoutList } from "@/components/features/workout/WorkoutList";

interface WorkoutsTabProps {
  workouts: any[];
}

export function WorkoutsTab({ workouts }: WorkoutsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Workout History</CardTitle>
        <CardDescription>View all workouts logged by this athlete</CardDescription>
      </CardHeader>
      <CardContent>
        {workouts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No workouts found</p>
        ) : (
          <WorkoutList workouts={workouts} readOnly={true} />
        )}
      </CardContent>
    </Card>
  );
}
