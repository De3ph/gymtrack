"use client";

import { CombinedTrainingCalendar } from "@/components/features/dashboard/CombinedTrainingCalendar";
import {
  DashboardMetric,
  DashboardShell,
} from "@/components/features/dashboard/DashboardShell";
import { TodayClientList } from "@/components/features/dashboard/TodayClientList";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { workoutApi, mealApi, relationshipApi } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import { useAuthStore } from "@/stores/authStore";
import dayjs from "dayjs";
import { CalendarDays, Dumbbell, UtensilsCrossed, User, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { staggerContainer, staggerItem } from "@/lib/animations";

function getWeekRange() {
  const start = dayjs().startOf("week");
  const end = dayjs().endOf("week");

  return {
    startDate: start.format("YYYY-MM-DD"),
    endDate: end.format("YYYY-MM-DD"),
  };
}

export default function RoleDashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const t = useTranslations("dashboard");
  const tAthlete = useTranslations("athlete.dashboard");
  const tTrainer = useTranslations("trainer.dashboard");
  const tCommon = useTranslations("common.actions");
  const weekRange = getWeekRange();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push(ROUTES.LOGIN);
    }
  }, [isLoading, router, user]);

  const { data: workoutData } = useQuery({
    queryKey: ["dashboard-athlete-workouts", weekRange.startDate, weekRange.endDate],
    queryFn: () => workoutApi.getAll(weekRange),
    enabled: user?.role === "athlete",
  });

  const { data: mealData } = useQuery({
    queryKey: ["dashboard-athlete-meals", weekRange.startDate, weekRange.endDate],
    queryFn: () => mealApi.getAll(weekRange),
    enabled: user?.role === "athlete",
  });

  const { data: trainerData } = useQuery({
    queryKey: ["dashboard-my-trainer"],
    queryFn: relationshipApi.getMyTrainer,
    enabled: user?.role === "athlete",
  });

  const { data: clientData } = useQuery({
    queryKey: ["dashboard-trainer-clients"],
    queryFn: relationshipApi.getMyClients,
    enabled: user?.role === "trainer",
  });

  if (isLoading || !user) {
    return null;
  }

  const activeTrainer = trainerData?.activeTrainer?.trainer;
  const workoutsThisWeek = workoutData?.workouts.length ?? 0;
  const mealsThisWeek = mealData?.meals.length ?? 0;
  const clients = clientData?.clients ?? [];
  const todayFocusClients = clients
    .filter((client) => client.relationship.status === "active")
    .sort((a, b) => dayjs(b.relationship.createdAt).valueOf() - dayjs(a.relationship.createdAt).valueOf());

  if (user.role === "trainer") {
    return (
      <DashboardShell
        eyebrow={tTrainer("eyebrow")}
        title={tTrainer("title")}
        description={tTrainer("description")}
      >
        <motion.section className="grid gap-4 md:grid-cols-3" variants={staggerContainer} initial="hidden" animate="visible">
          <DashboardMetric label={t("stats.clients")} value={clients.length} hint={tTrainer("client_hint")} />
          <DashboardMetric label={tTrainer("today_focus")} value={todayFocusClients.length} hint={tTrainer("focus_hint")} />
          <DashboardMetric label={tTrainer("plans")} value="—" hint={tTrainer("plan_hint")} />
        </motion.section>

        <motion.section className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]" variants={staggerContainer} initial="hidden" animate="visible">
          <TodayClientList clients={todayFocusClients} />
          <Card className="rounded-[1.5rem]">
            <CardHeader>
              <CardTitle>{tTrainer("actions_title")}</CardTitle>
              <CardDescription>{tTrainer("actions_description")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <ActionButton
                icon={<Users className="h-4 w-4" />}
                label={tTrainer("invite_athlete")}
                description={tTrainer("invite_description")}
                onClick={() => router.push(ROUTES.TRAINER_CLIENTS)}
              />
              <ActionButton
                icon={<Dumbbell className="h-4 w-4" />}
                label={tTrainer("workout_plans")}
                description={tTrainer("plans_description")}
                onClick={() => router.push(ROUTES.TRAINER_WORKOUT_PLANS)}
              />
              <ActionButton
                icon={<User className="h-4 w-4" />}
                label={tCommon("view_client")}
                description={tTrainer("clients_description")}
                onClick={() => router.push(ROUTES.TRAINER_CLIENTS)}
              />
            </CardContent>
          </Card>
        </motion.section>

        <motion.section variants={staggerContainer} initial="hidden" animate="visible">
          {todayFocusClients.length > 0 ? (
            <div className="grid gap-3">
              {todayFocusClients.slice(0, 3).map((client) => (
                <motion.div key={client.relationship.relationshipId} variants={staggerItem}>
                  <button
                    type="button"
                    onClick={() => router.push(`/trainer/client/${client.athlete.username}`)}
                    className="flex w-full items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 text-left transition hover:bg-muted/60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-foreground">{client.athlete.profile.name || tTrainer("unknown_athlete")}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {client.athlete.profile.fitnessGoals || tTrainer("no_goal")}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-medium text-primary">{tCommon("view")}</span>
                  </button>
                </motion.div>
              ))}
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users className="size-6" />
                </EmptyMedia>
                <EmptyTitle>{tTrainer("no_clients_title")}</EmptyTitle>
              </EmptyHeader>
              <EmptyContent>
                <EmptyDescription>{tTrainer("no_clients_description")}</EmptyDescription>
              </EmptyContent>
            </Empty>
          )}
        </motion.section>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      eyebrow={tAthlete("eyebrow")}
      title={tAthlete("title")}
      description={tAthlete("description")}
    >
      <motion.section className="grid gap-4 md:grid-cols-3" variants={staggerContainer} initial="hidden" animate="visible">
        <DashboardMetric label={t("stats.workouts")} value={workoutsThisWeek} hint={tAthlete("workout_hint")} />
        <DashboardMetric label={t("stats.meals")} value={mealsThisWeek} hint={tAthlete("meal_hint")} />
        <DashboardMetric
          label={tAthlete("trainer")}
          value={activeTrainer ? activeTrainer.profile.name : "—"}
          hint={activeTrainer ? tAthlete("trainer_connected") : tAthlete("trainer_empty")}
        />
      </motion.section>

      <motion.section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]" variants={staggerContainer} initial="hidden" animate="visible">
        <CombinedTrainingCalendar startDate={weekRange.startDate} endDate={weekRange.endDate} />
        <Card className="rounded-[1.5rem]">
          <CardHeader>
            <CardTitle>{tAthlete("quick_title")}</CardTitle>
            <CardDescription>{tAthlete("quick_description")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <ActionButton
              icon={<Dumbbell className="h-4 w-4" />}
              label={tAthlete("log_workout")}
              description={tAthlete("log_workout_description")}
              onClick={() => router.push(ROUTES.ATHLETE_WORKOUTS)}
            />
            <ActionButton
              icon={<UtensilsCrossed className="h-4 w-4" />}
              label={tAthlete("log_meal")}
              description={tAthlete("log_meal_description")}
              onClick={() => router.push(ROUTES.ATHLETE_MEALS)}
            />
            <ActionButton
              icon={<CalendarDays className="h-4 w-4" />}
              label={tAthlete("calendar")}
              description={tAthlete("calendar_description")}
              onClick={() => router.push(ROUTES.ATHLETE_WORKOUTS)}
            />
            {activeTrainer ? (
              <ActionButton
                icon={<User className="h-4 w-4" />}
                label={activeTrainer.profile.name}
                description={tAthlete("trainer_connected_description")}
                onClick={() => router.push(`/athlete/my-trainer/${activeTrainer.userId}`)}
              />
            ) : (
              <ActionButton
                icon={<User className="h-4 w-4" />}
                label={tAthlete("find_trainer")}
                description={tAthlete("find_trainer_description")}
                onClick={() => router.push(ROUTES.ATHLETE_TRAINERS)}
              />
            )}
          </CardContent>
        </Card>
      </motion.section>
    </DashboardShell>
  );
}

function ActionButton({
  icon,
  label,
  description,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-auto justify-start gap-3 rounded-2xl p-4 text-left"
      onClick={onClick}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </div>
      <span className="min-w-0">
        <span className="block truncate font-semibold text-foreground">{label}</span>
        <span className="block truncate text-sm text-muted-foreground">{description}</span>
      </span>
    </Button>
  );
}
