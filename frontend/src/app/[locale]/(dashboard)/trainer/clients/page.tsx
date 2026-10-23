"use client";

import { GenerateInvitationDialog } from "@/components/features/trainer/GenerateInvitationDialog";
import { ClientCard } from "@/components/features/trainer/ClientCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { relationshipApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/authStore";
import { UserPlus, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useEffect, useDeferredValue, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ROUTES, buildRoute } from "@/lib/routes";
import * as m from "motion/react-m";
import { staggerContainer } from "@/lib/animations";
import { STALE_TIMES } from "@/lib/api/api-constants";
import { MotionProvider } from "@/components/ui/motion-provider";

export default function TrainerClientsPage() {
  const tCommonLoading = useTranslations("common");
  const router = useRouter();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearch = useDeferredValue(searchTerm);
  const t = useTranslations("trainer.clients");
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: qk.clients.list,
    queryFn: () => relationshipApi.getMyClients(),
    staleTime: STALE_TIMES.FIVE_MINUTES,
    enabled: user?.role === "trainer",
  });
  const clients = useMemo(() => data?.clients ?? [], [data]);

  useEffect(() => {
    if (user && user.role !== "trainer") {
      router.push(ROUTES.HOME);
    }
  }, [user, router]);

  const filteredClients = useMemo(
    () =>
      clients.filter(
        (client) =>
          client.athlete?.profile?.name
            ?.toLowerCase()
            .includes(deferredSearch.toLowerCase()) ||
          client.athlete?.email
            ?.toLowerCase()
            .includes(deferredSearch.toLowerCase()),
      ),
    [clients, deferredSearch],
  );

  const handleViewClient = (clientId: string) => {
    router.push(buildRoute("TRAINER_CLIENT_DETAIL", clientId));
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <Spinner className="size-5" />
          <span>{tCommonLoading("loading")}</span>
        </div>
      </div>
    );
  }

  return (
    <MotionProvider>
      <div className="container mx-auto py-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {t("title")}
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {t("description")}
            </p>
          </div>
          <Button
            onClick={() => setShowInviteDialog(true)}
            className="rounded-none font-mono text-[10px] uppercase tracking-[0.18em]"
          >
            <UserPlus className="size-5" aria-hidden="true" />
            {t("invite_athlete")}
          </Button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 border border-destructive px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-destructive"
          >
            {error instanceof Error ? error.message : String(error)}
          </div>
        )}

        {clients.length > 0 && (
          <div className="mb-4">
            <Input
              type="text"
              placeholder={t("search_placeholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-sm"
            />
          </div>
        )}

        {clients.length === 0 ? (
          <Empty className="rounded-none border border-border">
            <EmptyHeader>
              <EmptyMedia
                variant="default"
                className="rounded-none bg-transparent"
              >
                <Users
                  className="size-5 text-muted-foreground"
                  aria-hidden="true"
                />
              </EmptyMedia>
              <EmptyTitle className="font-mono text-[10px] uppercase tracking-[0.18em]">
                {t("no_clients_title")}
              </EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
              <EmptyDescription>{t("no_clients_description")}</EmptyDescription>
              <Button
                onClick={() => setShowInviteDialog(true)}
                className="rounded-none font-mono text-[10px] uppercase tracking-[0.18em]"
              >
                <UserPlus className="size-5" aria-hidden="true" />
                {t("invite_first_athlete")}
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <m.div
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {filteredClients.map((client) => (
              <ClientCard
                key={client.relationship?.relationshipId}
                client={client}
                onViewClient={handleViewClient}
              />
            ))}
          </m.div>
        )}

        {filteredClients.length === 0 && clients.length > 0 && (
          <Empty className="rounded-none border border-border">
            <EmptyHeader>
              <EmptyTitle className="font-mono text-[10px] uppercase tracking-[0.18em]">
                {t("no_results_title")}
              </EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
              <EmptyDescription>{t("no_results_description")}</EmptyDescription>
            </EmptyContent>
          </Empty>
        )}

        <GenerateInvitationDialog
          open={showInviteDialog}
          onOpenChange={setShowInviteDialog}
        />
      </div>
    </MotionProvider>
  );
}
