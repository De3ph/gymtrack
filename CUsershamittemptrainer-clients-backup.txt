"use client";

import { GenerateInvitationDialog } from "@/components/features/trainer/GenerateInvitationDialog";
import { ClientCard } from "@/components/features/trainer/ClientCard";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { relationshipApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import {
  Loader2,
  UserPlus,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition, useEffect } from "react"; import { useQuery } from "@tanstack/react-query"; // useEffect removed as data fetching handled by TanStack Query
import { ROUTES, buildRoute } from "@/lib/routes";
import { motion } from "motion/react";
import { staggerContainer } from "@/lib/animations";

export default function TrainerClientsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState("");
  const t = useTranslations('trainer.clients');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Fetch clients using TanStack Query
  const { data, isLoading, error } = useQuery({
    queryKey: ["myClients"],
    queryFn: () => relationshipApi.getMyClients(),
    staleTime: 5 * 60 * 1000,
    enabled: user?.role === "trainer",
  });
  const clients = data?.clients ?? [];

  // Guard: redirect if not a trainer
  useEffect(() => {
    if (user && user.role !== "trainer") {
      router.push(ROUTES.HOME);
    }
  }, [user, router]);

  const filteredClients = clients.filter(
    (client) =>
      client.athlete?.profile?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      client.athlete?.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleSearch = (term: string) => {
    startTransition(() => {
      setSearchTerm(term);
    });
  };

  const handleViewClient = (clientId: string) => {
    router.push(buildRoute('TRAINER_CLIENT_DETAIL', clientId));
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('description')}
          </p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          {t('invite_athlete')}
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          {error instanceof Error ? error.message : String(error)}
        </div>
      )}

      {clients.length > 0 && (
        <div className="mb-4">
          <input
            type="text"
            placeholder={t('search_placeholder')}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      )}

      {clients.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users className="size-6" />
            </EmptyMedia>
            <EmptyTitle>{t('no_clients_title')}</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <EmptyDescription>
              {t('no_clients_description')}
            </EmptyDescription>
            <Button onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              {t('invite_first_athlete')}
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <motion.div
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
        </motion.div>
      )}

      {filteredClients.length === 0 && clients.length > 0 && (
        <Empty>
          <EmptyHeader>
                <EmptyTitle>{t('no_results_title')}</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <EmptyDescription>
              {t('no_results_description')}
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      )}

      <GenerateInvitationDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
      />
    </div>
  );
}
