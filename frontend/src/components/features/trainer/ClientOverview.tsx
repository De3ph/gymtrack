"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "./StatCard";
import { Dumbbell, Utensils, Calendar } from "lucide-react";
import { User, ClientStats } from "@/types";
import { useTranslations } from 'next-intl';

interface ClientOverviewProps {
  athlete: User | null;
  stats: ClientStats | null;
}

export function ClientOverview({ athlete, stats }: ClientOverviewProps) {
  const t = useTranslations('trainer.client_detail.overview');
  const tProfile = useTranslations('profile.fields');
  const tUnits = useTranslations('profile.units');

  return (
    <>
      {/* Stats Cards */}
      {stats && (
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard
            title={t('total_workouts')}
            value={stats.totalWorkouts}
            icon={Dumbbell}
          />
          <StatCard
            title={t('total_meals')}
            value={stats.totalMeals}
            icon={Utensils}
          />
          <StatCard
            title={t('workouts_this_week')}
            value={stats.workoutsThisWeek}
            icon={Calendar}
          />
          <StatCard
            title={t('meals_this_week')}
            value={stats.mealsThisWeek}
            icon={Calendar}
          />
        </div>
      )}

      {/* Client Info */}
      {athlete?.profile ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('athlete_profile')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {athlete.profile.age ? (
                <div>
                  <span className="text-sm font-medium">{tProfile('age')}:</span> {athlete.profile.age}
                </div>
              ) : null}
              {athlete.profile.weight ? (
                <div>
                  <span className="text-sm font-medium">{tProfile('weight')}:</span> {athlete.profile.weight} {tUnits('kg')}
                </div>
              ) : null}
              {athlete.profile.height ? (
                <div>
                  <span className="text-sm font-medium">{tProfile('height')}:</span> {athlete.profile.height} {tUnits('cm')}
                </div>
              ) : null}
              {athlete.profile.fitnessGoals ? (
                <div className="md:col-span-2">
                  <span className="text-sm font-medium">{tProfile('fitness_goals')}:</span> {athlete.profile.fitnessGoals}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
