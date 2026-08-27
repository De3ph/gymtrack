"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { ClientWithAthlete } from "@/types";
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
    <div className="border border-border bg-card">
      <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-4 sm:px-8">
        <div className="space-y-1">
          <h2 className="font-sans text-base font-semibold leading-tight text-foreground">{t("title")}</h2>
          <p className="font-sans text-sm leading-6 text-muted-foreground">{t("description")}</p>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center border border-border bg-background text-muted-foreground" aria-hidden="true">
          <UserCheck className="size-4" />
        </span>
      </header>
      <div className="p-6">
        {focusClients.length === 0 ? (
          <Empty className="rounded-none border border-border bg-card">
            <EmptyHeader>
              <EmptyTitle className="font-sans text-base font-semibold text-foreground">
                {t("empty_title")}
              </EmptyTitle>
              <EmptyDescription className="font-sans text-sm leading-6 text-muted-foreground">
                {t("empty_description")}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <motion.ul className="border border-border divide-y divide-border" variants={staggerContainer} initial="hidden" animate="visible">
            {focusClients.map((client) => (
              <TodayClientRow
                key={client.relationship.relationshipId}
                client={client}
                onViewClient={handleViewClient}
                tCommon={tCommon}
              />
            ))}
          </motion.ul>
        )}
      </div>
    </div>
  );
}

const TodayClientRow = memo(function TodayClientRow({
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
    <motion.li variants={staggerItem} className="list-none">
      <Item
        variant="outline"
        size="default"
        className="rounded-none border-0 border-b border-border last:border-b-0"
      >
        <ItemMedia
          variant="icon"
          className="rounded-none border border-border bg-background font-mono text-xs font-medium text-foreground"
          aria-hidden="true"
        >
          {initials(name)}
        </ItemMedia>
        <ItemContent>
          <ItemTitle className="font-sans text-sm font-semibold text-foreground">{name}</ItemTitle>
          <ItemDescription className="font-sans text-sm leading-6 text-muted-foreground">
            {goal || t("no_goal")}
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewClient(client.athlete?.username || "")}
            className="rounded-none font-mono text-xs uppercase tracking-[0.18em]"
          >
            <Eye className="size-3.5" aria-hidden="true" />
            {tCommon("view_client")}
          </Button>
        </ItemActions>
      </Item>
    </motion.li>
  );
})

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "A";
}
