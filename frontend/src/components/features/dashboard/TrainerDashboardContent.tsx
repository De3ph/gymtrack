"use client";

import { DashboardActionButton } from "@/components/features/dashboard/DashboardActionButton";
import { DashboardMetric, DashboardShell } from "@/components/features/dashboard/DashboardShell";
import { TodayClientList } from "@/components/features/dashboard/TodayClientList";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { relationshipApi } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Dumbbell, User, Users } from "lucide-react";
import dayjs from "dayjs";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/animations";

export function TrainerDashboardContent() {
  const router = useRouter();
  const t = useTranslations("dashboard");
  const tTrainer = useTranslations("trainer.dashboard");
  const tCommon = useTranslations("common.actions");

  const { data: clientData } = useQuery({
    queryKey: ["dashboard-trainer-clients"],
    queryFn: relationshipApi.getMyClients,
  });

  const clients = clientData?.clients ?? [];
  const todayFocusClients = clients
    .filter((client) => client.relationship.status === "active")
    .sort((a, b) => dayjs(b.relationship.createdAt).valueOf() - dayjs(a.relationship.createdAt).valueOf());

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
            <DashboardActionButton
              icon={<Users className="h-4 w-4" />}
              label={tTrainer("invite_athlete")}
              description={tTrainer("invite_description")}
              onClick={() => router.push(ROUTES.TRAINER_CLIENTS)}
            />
            <DashboardActionButton
              icon={<Dumbbell className="h-4 w-4" />}
              label={tTrainer("workout_plans")}
              description={tTrainer("plans_description")}
              onClick={() => router.push(ROUTES.TRAINER_WORKOUT_PLANS)}
            />
            <DashboardActionButton
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
