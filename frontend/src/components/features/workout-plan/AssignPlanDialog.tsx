"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { relationshipApi, workoutPlanApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { ApiErrorHandler } from "@/lib/error-handler";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface AssignPlanDialogProps {
  planId: string;
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export function AssignPlanDialog({
  planId,
  trigger,
  onSuccess,
}: AssignPlanDialogProps) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: clientsData, isLoading } = useQuery({
    queryKey: ["my-clients"],
    queryFn: () => relationshipApi.getMyClients(),
  });

  const clients = clientsData?.clients || [];

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      workoutPlanApi.assign(planId, { athleteIds: selectedIds }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
      setSelectedIds([]);
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      ApiErrorHandler.handle(error);
    },
  });

  const toggleClient = (athleteId: string) => {
    setSelectedIds((prev) =>
      prev.includes(athleteId)
        ? prev.filter((id) => id !== athleteId)
        : [...prev, athleteId],
    );
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onSuccess?.(); }}>
      {trigger}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Plan to Clients</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : clients.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active clients found.
          </p>
        ) : (
          <div className="space-y-3 py-2">
            {clients.map((client) => (
              <div
                key={client.athlete.userId}
                className="flex items-center gap-3"
              >
                <Checkbox
                  id={client.athlete.userId}
                  checked={selectedIds.includes(client.athlete.userId)}
                  onCheckedChange={() => toggleClient(client.athlete.userId)}
                />
                <Label
                  htmlFor={client.athlete.userId}
                  className="cursor-pointer"
                >
                  {client.athlete.profile?.name || client.athlete.username}
                </Label>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onSuccess?.()}>
            Cancel
          </Button>
          <Button
            onClick={() => mutate()}
            disabled={isPending || selectedIds.length === 0}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign ({selectedIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
