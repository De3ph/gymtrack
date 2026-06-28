"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, UserCheck, Activity, TrendingUp, Calendar, Dumbbell, UtensilsCrossed } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import type { AdminDashboardStats } from "@/lib/api/adminApi";

const statCards: Array<{
  key: keyof AdminDashboardStats;
  label: string;
  icon: typeof Users;
  color: string;
  bg: string;
}> = [
  { key: "totalUsers", label: "Total Users", icon: Users, color: "text-primary", bg: "bg-primary/10" },
  { key: "totalTrainers", label: "Trainers", icon: GraduationCap, color: "text-accent", bg: "bg-accent/10" },
  { key: "totalAthletes", label: "Athletes", icon: UserCheck, color: "text-chart-3", bg: "bg-chart-3/10" },
  { key: "newUsersToday", label: "New Today", icon: Activity, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { key: "newUsersThisWeek", label: "New This Week", icon: TrendingUp, color: "text-violet-500", bg: "bg-violet-500/10" },
  { key: "newUsersThisMonth", label: "New This Month", icon: Calendar, color: "text-amber-500", bg: "bg-amber-500/10" },
  { key: "totalWorkouts", label: "Total Workouts", icon: Dumbbell, color: "text-sky-500", bg: "bg-sky-500/10" },
  { key: "totalMeals", label: "Total Meals", icon: UtensilsCrossed, color: "text-rose-500", bg: "bg-rose-500/10" },
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
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          System overview and user management
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const value = stats[card.key];
          return (
            <Card key={card.key} size="sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.label}
                  </CardTitle>
                  <div className={`rounded-lg p-2 ${card.bg}`}>
                    <Icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatStat(value)}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              View and manage all registered users. Filter by role, search by
              name or email, and inspect individual account details.
            </p>
            <button
              onClick={() => router.push(ROUTES.ADMIN_USERS)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors"
            >
              <Users className="h-4 w-4" />
              Manage Users
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Monitor platform growth and engagement. Track new registrations,
              workout volume, and nutrition logging trends over time.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">
                  {formatStat(stats.newUsersToday)} today
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">
                  {formatStat(stats.newUsersThisWeek)} this week
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
