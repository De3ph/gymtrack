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
import { Eye, Users } from "lucide-react";
import dayjs from "dayjs";
import { motion } from "motion/react";
import { staggerItem } from "@/lib/animations";

interface ClientCardProps {
  client: ClientWithAthlete;
  onViewClient: (clientId: string) => void;
}

export function ClientCard({ client, onViewClient }: ClientCardProps) {
  return (
    <motion.div
      key={client.relationship?.relationshipId}
      variants={staggerItem}
    >
      <Card>
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
                ? dayjs(client.relationship.createdAt).format("DD/MM/YYYY")
                : "N/A"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() =>
                onViewClient(client.athlete?.userId || "")
              }
            >
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
