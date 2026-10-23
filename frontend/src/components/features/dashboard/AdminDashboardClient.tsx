"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Users, GraduationCap, UserCheck, Activity, TrendingUp, Calendar, Dumbbell, UtensilsCrossed, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import type { AdminDashboardStats } from "@/lib/api/adminApi";

const statCards: Array<{
  key: keyof AdminDashboardStats;
  labelKey: string;
  icon: typeof Users;
}> = [
  { key: "totalUsers", labelKey: "stats.total_users", icon: Users },
  { key: "totalTrainers", labelKey: "stats.trainers", icon: GraduationCap },
  { key: "totalAthletes", labelKey: "stats.athletes", icon: UserCheck },
  { key: "newUsersToday", labelKey: "stats.new_today", icon: Activity },
  { key: "newUsersThisWeek", labelKey: "stats.new_this_week", icon: TrendingUp },
  { key: "newUsersThisMonth", labelKey: "stats.new_this_month", icon: Calendar },
  { key: "totalWorkouts", labelKey: "stats.total_workouts", icon: Dumbbell },
  { key: "totalMeals", labelKey: "stats.total_meals", icon: UtensilsCrossed },
];

function formatStat(value: number | undefined): string {
  if (value === undefined) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

export interface AdminDashboardClientProps {
  stats: AdminDashboardStats;
}

export function AdminDashboardClient({ stats }: AdminDashboardClientProps) {
  const router = useRouter();
  const t = useTranslations("admin.dashboard");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-mono text-3xl leading-tight tracking-[-0.04em]">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {t("description")}
        </p>
      </div>

      {/* Stats Grid — scoreboard panel, hairline cells */}
      <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const value = stats[card.key];
          return (
            <div key={card.key} className="bg-background p-6">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase leading-3 tracking-[0.18em] text-muted-foreground">
                  {t(card.labelKey)}
                </span>
                <Icon
                  className="size-5 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-4 font-mono text-3xl leading-none tracking-tight text-foreground">
                {formatStat(value)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="border border-border">
          <header className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="font-mono text-[10px] uppercase leading-3 tracking-[0.18em] text-muted-foreground">
              {t("user_management.title")}
            </h2>
          </header>
          <div className="space-y-4 px-6 py-6">
            <p className="text-sm leading-6 text-muted-foreground">
              {t("user_management.description")}
            </p>
            <Button
              variant="outline"
              className="rounded-none border-foreground font-mono text-xs uppercase tracking-[0.18em] hover:bg-foreground hover:text-background"
              onClick={() => router.push(ROUTES.ADMIN_USERS)}
            >
              <Users className="size-5" aria-hidden="true" />
              {t("user_management.action")}
              <ArrowUpRight className="size-5" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="border border-border">
          <header className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="font-mono text-[10px] uppercase leading-3 tracking-[0.18em] text-muted-foreground">
              {t("platform_activity.title")}
            </h2>
            <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <span
                className="size-1.5 animate-pulse rounded-full bg-accent"
                aria-hidden="true"
              />
              {t("platform_activity.live")}
            </span>
          </header>
          <div className="space-y-4 px-6 py-6">
            <p className="text-sm leading-6 text-muted-foreground">
              {t("platform_activity.description")}
            </p>
            <div className="flex items-center gap-6 font-mono text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="size-1.5 rounded-full bg-accent"
                  aria-hidden="true"
                />
                <span className="text-foreground">
                  {formatStat(stats.newUsersToday)}
                </span>
                <span className="text-muted-foreground">
                  {t("platform_activity.today")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="size-1.5 rounded-full bg-foreground"
                  aria-hidden="true"
                />
                <span className="text-foreground">
                  {formatStat(stats.newUsersThisWeek)}
                </span>
                <span className="text-muted-foreground">
                  {t("platform_activity.this_week")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
