"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { adminApi } from "@/lib/api/adminApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/lib/routes";
import {
  Users,
  UserCheck,
  UserPlus,
  CalendarDays,
  Dumbbell,
  Utensils,
  TrendingUp,
  Activity,
} from "lucide-react";

const statCards = [
  {
    key: "totalUsers" as const,
    label: "Total Users",
    icon: Users,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    key: "totalTrainers" as const,
    label: "Trainers",
    icon: UserCheck,
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    key: "totalAthletes" as const,
    label: "Athletes",
    icon: Activity,
    color: "text-chart-3",
    bg: "bg-chart-3/10",
  },
  {
    key: "newUsersToday" as const,
    label: "New Today",
    icon: UserPlus,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    key: "newUsersThisWeek" as const,
    label: "New This Week",
    icon: CalendarDays,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    key: "newUsersThisMonth" as const,
    label: "New This Month",
    icon: TrendingUp,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    key: "totalWorkouts" as const,
    label: "Total Workouts",
    icon: Dumbbell,
    color: "text-sky-500",
    bg: "bg-sky-500/10",
  },
  {
    key: "totalMeals" as const,
    label: "Total Meals",
    icon: Utensils,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
];

function formatStat(value: number | undefined): string {
  if (value === undefined) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, initializeAuth, isInitialized } =
    useAuthStore();

  useEffect(() => {
    if (!isInitialized) initializeAuth();
  }, [initializeAuth, isInitialized]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push(ROUTES.LOGIN);
  }, [isAuthenticated, isLoading, router]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => adminApi.getDashboardStats(),
    enabled: isAuthenticated && user?.role === "admin",
  });

  if (!isAuthenticated || isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

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
          const value = stats ? stats[card.key] : undefined;
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
                {statsLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">{formatStat(value)}</div>
                )}
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
                  {statsLoading
                    ? "..."
                    : `${formatStat(stats?.newUsersToday)} today`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">
                  {statsLoading
                    ? "..."
                    : `${formatStat(stats?.newUsersThisWeek)} this week`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
