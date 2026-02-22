"use client";

import { GenerateInvitationDialog } from "@/components/features/trainer/GenerateInvitationDialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { relationshipApi } from "@/lib/api";
import { ClientWithAthlete } from "@/lib/api-types";
import { useAuthStore } from "@/stores/authStore";
import {
  Eye,
  Loader2,
  UserPlus,
  Users,
  Dumbbell,
  Utensils,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dayjs from "dayjs";

export default function TrainerClientsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [clients, setClients] = useState<ClientWithAthlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (user?.role !== "trainer") {
      router.push("/");
      return;
    }

    fetchClients();
  }, [user, router]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await relationshipApi.getMyClients();
      setClients(response.clients ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(
    (client) =>
      client.athlete?.profile?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      client.athlete?.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleViewClient = (clientId: string) => {
    router.push(`/trainer/client/${clientId}`);
  };

  if (loading) {
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
          <h1 className="text-3xl font-bold">My Clients</h1>
          <p className="text-muted-foreground">
            Manage your athlete relationships and view their progress
          </p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Athlete
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {clients.length > 0 && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      )}

      {clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No Clients Yet</h3>
            <p className="mb-4 text-center text-muted-foreground">
              You don&apos;t have any active clients yet. Generate an invitation
              code to start working with athletes.
            </p>
            <Button onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Your First Athlete
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <Card key={client.relationship?.relationshipId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {client.athlete?.profile?.name || "Unknown Athlete"}
                </CardTitle>
                <CardDescription>{client.athlete?.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 space-y-2 text-sm">
                  {client.athlete?.profile?.fitnessGoals && (
                    <p className="text-muted-foreground line-clamp-2">
                      Goals: {client.athlete.profile.fitnessGoals}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Client since{" "}
                    {client.relationship?.createdAt
                      ? dayjs(client.relationship.createdAt).format(
                          "MMM D, YYYY",
                        )
                      : "N/A"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() =>
                      handleViewClient(client.athlete?.userId || "")
                    }
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredClients.length === 0 && clients.length > 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">
              No clients match your search.
            </p>
          </CardContent>
        </Card>
      )}

      <GenerateInvitationDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
      />
    </div>
  );
}
