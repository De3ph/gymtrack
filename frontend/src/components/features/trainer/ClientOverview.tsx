"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "./StatCard";
import { Dumbbell, Utensils, Calendar } from "lucide-react";
import { User, ClientStats } from "@/types";

interface ClientOverviewProps {
  athlete: User | null;
  stats: ClientStats | null;
}

export function ClientOverview({ athlete, stats }: ClientOverviewProps) {
  return (
    <>
      {/* Stats Cards */}
      {stats && (
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard
            title="Total Workouts"
            value={stats.totalWorkouts}
            icon={Dumbbell}
          />
          <StatCard
            title="Total Meals"
            value={stats.totalMeals}
            icon={Utensils}
          />
          <StatCard
            title="Workouts This Week"
            value={stats.workoutsThisWeek}
            icon={Calendar}
          />
          <StatCard
            title="Meals This Week"
            value={stats.mealsThisWeek}
            icon={Calendar}
          />
        </div>
      )}

      {/* Client Info */}
      {athlete?.profile ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Athlete Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {athlete.profile.age ? (
                <div>
                  <span className="text-sm font-medium">Age:</span> {athlete.profile.age}
                </div>
              ) : null}
              {athlete.profile.weight ? (
                <div>
                  <span className="text-sm font-medium">Weight:</span> {athlete.profile.weight} kg
                </div>
              ) : null}
              {athlete.profile.height ? (
                <div>
                  <span className="text-sm font-medium">Height:</span> {athlete.profile.height} cm
                </div>
              ) : null}
              {athlete.profile.fitnessGoals ? (
                <div className="md:col-span-2">
                  <span className="text-sm font-medium">Fitness Goals:</span> {athlete.profile.fitnessGoals}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
