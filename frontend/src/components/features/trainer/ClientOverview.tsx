"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { StatCard } from "./StatCard";
import { Calendar } from "lucide-react";
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
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <StatCard
            title={t('workouts_this_week')}
            value={stats?.workoutsThisWeek ?? 0}
            icon={Calendar}
            className="rounded-none border border-border"
          />
          <StatCard
            title={t('meals_this_week')}
            value={stats?.mealsThisWeek ?? 0}
            icon={Calendar}
            className="rounded-none border border-border"
          />
        </div>
      )}

      {/* Client Info */}
      {athlete?.profile ? (
        <div className="rounded-none border border-border mb-6">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('athlete_profile')}</h3>
          </div>
          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-2">
              {athlete.profile.age ? (
                <div>
                  <span className="text-sm font-[500]">{tProfile('age')}:</span> {athlete.profile.age}
                </div>
              ) : null}
              {athlete.profile.weight ? (
                <div>
                  <span className="text-sm font-[500]">{tProfile('weight')}:</span> {athlete.profile.weight} {tUnits('kg')}
                </div>
              ) : null}
              {athlete.profile.height ? (
                <div>
                  <span className="text-sm font-[500]">{tProfile('height')}:</span> {athlete.profile.height} {tUnits('cm')}
                </div>
              ) : null}
              {athlete.profile.fitnessGoals ? (
                <div className="md:col-span-2">
                  <span className="text-sm font-[500]">{tProfile('fitness_goals')}:</span> {athlete.profile.fitnessGoals}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
