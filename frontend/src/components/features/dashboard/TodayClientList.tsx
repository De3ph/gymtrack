"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClientWithAthlete } from "@/lib/api/api-types";
import { buildRoute } from "@/lib/routes";
import { Eye, UserCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { staggerContainer, staggerItem } from "@/lib/animations";

interface TodayClientListProps {
  clients: ClientWithAthlete[];
  limit?: number;
}

export function TodayClientList({ clients, limit = 4 }: TodayClientListProps) {
  const t = useTranslations("dashboard.todayClients");
  const tCommon = useTranslations("common.actions");
  const router = useRouter();

  const focusClients = clients.slice(0, limit);

  const handleViewClient = (username: string) => {
    router.push(buildRoute("TRAINER_CLIENT_DETAIL", username));
  };

  return (
    <Card className="rounded-[1.5rem]">
      <CardHeader className="gap-1 border-b border-border pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {focusClients.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center">
            <p className="font-heading text-lg font-medium text-foreground">
              {t("empty_title")}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("empty_description")}
            </p>
          </div>
        ) : (
          <motion.div className="space-y-3" variants={staggerContainer} initial="hidden" animate="visible">
            {focusClients.map((client) => (
              <TodayClientRow
                key={client.relationship.relationshipId}
                client={client}
                onViewClient={handleViewClient}
                tCommon={tCommon}
              />
            ))}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

function TodayClientRow({
  client,
  onViewClient,
  tCommon,
}: {
  client: ClientWithAthlete;
  onViewClient: (username: string) => void;
  tCommon: (key: string) => string;
}) {
  const t = useTranslations("dashboard.todayClients");
  const name = client.athlete?.profile?.name || t("unknown_athlete");
  const goal = client.athlete?.profile?.fitnessGoals;

  return (
    <motion.div variants={staggerItem}>
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted font-heading font-semibold text-foreground">
          {initials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{name}</p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {goal || t("no_goal")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => onViewClient(client.athlete?.username || "")}>
          <Eye className="mr-2 h-4 w-4" />
          {tCommon("view_client")}
        </Button>
      </div>
    </motion.div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "A";
}
