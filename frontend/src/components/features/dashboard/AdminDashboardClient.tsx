"use client";

import { useRouter } from "next/navigation";
import { Users, GraduationCap, UserCheck, Activity, TrendingUp, Calendar, Dumbbell, UtensilsCrossed, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import type { AdminDashboardStats } from "@/lib/api/adminApi";

const statCards: Array<{
  key: keyof AdminDashboardStats;
  label: string;
  icon: typeof Users;
}> = [
  { key: "totalUsers", label: "Total Users", icon: Users },
  { key: "totalTrainers", label: "Trainers", icon: GraduationCap },
  { key: "totalAthletes", label: "Athletes", icon: UserCheck },
  { key: "newUsersToday", label: "New Today", icon: Activity },
  { key: "newUsersThisWeek", label: "New This Week", icon: TrendingUp },
  { key: "newUsersThisMonth", label: "New This Month", icon: Calendar },
  { key: "totalWorkouts", label: "Total Workouts", icon: Dumbbell },
  { key: "totalMeals", label: "Total Meals", icon: UtensilsCrossed },
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-mono text-3xl leading-tight tracking-[-0.04em]">
          Admin Dashboard
        </h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          System overview and user management
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
                  {card.label}
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
              User Management
            </h2>
          </header>
          <div className="space-y-4 px-6 py-6">
            <p className="text-sm leading-6 text-muted-foreground">
              View and manage all registered users. Filter by role, search by
              name or email, and inspect individual account details.
            </p>
            <Button
              variant="outline"
              className="rounded-none border-foreground font-mono text-xs uppercase tracking-[0.18em] hover:bg-foreground hover:text-background"
              onClick={() => router.push(ROUTES.ADMIN_USERS)}
            >
              <Users className="size-5" aria-hidden="true" />
              Manage Users
              <ArrowUpRight className="size-5" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="border border-border">
          <header className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="font-mono text-[10px] uppercase leading-3 tracking-[0.18em] text-muted-foreground">
              Platform Activity
            </h2>
            <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <span
                className="size-1.5 animate-pulse rounded-full bg-accent"
                aria-hidden="true"
              />
              Live
            </span>
          </header>
          <div className="space-y-4 px-6 py-6">
            <p className="text-sm leading-6 text-muted-foreground">
              Monitor platform growth and engagement. Track new registrations,
              workout volume, and nutrition logging trends over time.
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
                <span className="text-muted-foreground">today</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="size-1.5 rounded-full bg-foreground"
                  aria-hidden="true"
                />
                <span className="text-foreground">
                  {formatStat(stats.newUsersThisWeek)}
                </span>
                <span className="text-muted-foreground">this week</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
