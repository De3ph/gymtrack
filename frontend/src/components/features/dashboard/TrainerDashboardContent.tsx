"use client";

import { DashboardActionButton } from "@/components/features/dashboard/DashboardActionButton";
import { DashboardMetric, DashboardShell } from "@/components/features/dashboard/DashboardShell";
import { TodayClientList } from "@/components/features/dashboard/TodayClientList";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import { relationshipApi } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Dumbbell, User, Users } from "lucide-react";
import dayjs from "dayjs";
import { useMemo } from "react";
import { motion } from "motion/react";
import { staggerContainer, staggerItem } from "@/lib/animations";

function ClientRow({
  client,
  viewLabel,
  onNavigate,
}: {
  client: { athlete: { username: string; profile?: { name?: string; fitnessGoals?: string } }; relationship: { relationshipId?: string | number } };
  viewLabel: string;
  onNavigate: (username: string) => void;
}) {
  return (
    <motion.li variants={staggerItem} className="list-none">
      <Item
        variant="outline"
        size="default"
        className="rounded-none border-0 border-b border-border last:border-b-0"
      >
        <ItemContent>
          <ItemTitle className="font-sans text-sm font-semibold text-foreground">
            {client.athlete.profile?.name || ""}
          </ItemTitle>
          <ItemDescription className="font-sans text-sm leading-6 text-muted-foreground">
            {client.athlete.profile?.fitnessGoals || ""}
          </ItemDescription>
        </ItemContent>
        <button
          type="button"
          onClick={() => onNavigate(client.athlete.username)}
          className="shrink-0 font-mono text-xs uppercase tracking-[0.18em] text-foreground underline underline-offset-4 hover:text-muted-foreground"
          aria-label={`${viewLabel} ${client.athlete.profile?.name || client.athlete.username}`}
        >
          {viewLabel}
        </button>
      </Item>
    </motion.li>
  );
}
export function TrainerDashboardContent() {
  const router = useRouter();
  const t = useTranslations("dashboard");
  const tTrainer = useTranslations("trainer.dashboard");
  const tCommon = useTranslations("common.actions");

  const { data: clientData } = useQuery({
    queryKey: ["dashboard-trainer-clients"],
    queryFn: relationshipApi.getMyClients,
  });

  const clients = useMemo(() => clientData?.clients ?? [], [clientData]);
  const todayFocusClients = useMemo(() => clients
    .filter((client) => client.relationship.status === "active")
    .sort((a, b) => dayjs(b.relationship.createdAt).valueOf() - dayjs(a.relationship.createdAt).valueOf()),
  [clients],
 );

  const handleViewClient = (username: string) => {
    router.push(`/trainer/client/${username}`);
  };

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
        <div className="border border-border bg-card">
          <header className="border-b border-border px-6 py-4 sm:px-8">
            <h2 className="font-sans text-base font-semibold leading-tight text-foreground">
              {tTrainer("actions_title")}
            </h2>
            <p className="mt-1 font-sans text-sm leading-6 text-muted-foreground">
              {tTrainer("actions_description")}
            </p>
          </header>
          <div className="grid gap-3 p-6 sm:grid-cols-2 sm:px-8">
            <DashboardActionButton
              icon={<Users className="size-5" aria-hidden="true" />}
              label={tTrainer("invite_athlete")}
              description={tTrainer("invite_description")}
              onClick={() => router.push(ROUTES.TRAINER_CLIENTS)}
            />
            <DashboardActionButton
              icon={<Dumbbell className="size-5" aria-hidden="true" />}
              label={tTrainer("workout_plans")}
              description={tTrainer("plans_description")}
              onClick={() => router.push(ROUTES.TRAINER_WORKOUT_PLANS)}
            />
            <DashboardActionButton
              icon={<User className="size-5" aria-hidden="true" />}
              label={tCommon("view_client")}
              description={tTrainer("clients_description")}
              onClick={() => router.push(ROUTES.TRAINER_CLIENTS)}
            />
          </div>
        </div>
      </motion.section>

      <motion.section variants={staggerContainer} initial="hidden" animate="visible">
        {todayFocusClients.length > 0 ? (
          <ul className="border border-border divide-y divide-border">
            {todayFocusClients.slice(0, 3).map((client) => (
              <ClientRow
                key={client.relationship.relationshipId}
                client={client}
                viewLabel={tCommon("view")}
                onNavigate={handleViewClient}
              />
            ))}
          </ul>
        ) : (
          <Empty className="rounded-none border border-border bg-card">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="rounded-none border border-border bg-background">
                <Users className="size-5 text-muted-foreground" aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle className="font-sans text-base font-semibold text-foreground">
                {tTrainer("no_clients_title")}
              </EmptyTitle>
              <EmptyDescription className="font-sans text-sm leading-6 text-muted-foreground">
                {tTrainer("no_clients_description")}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </motion.section>
    </DashboardShell>
  );
}
