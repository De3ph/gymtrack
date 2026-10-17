"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { relationshipApi, workoutPlanApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { ApiErrorHandler } from "@/lib/error-handler";
import { revalidateWorkoutPlansCache } from "@/lib/actions/cache";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";

interface AssignPlanDialogProps {
  planId: string | number;
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export function AssignPlanDialog({
  planId,
  trigger,
  onSuccess,
}: AssignPlanDialogProps) {
  const t = useTranslations('trainer.workout_plans')
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const { data: clientsData, isLoading } = useQuery({
    queryKey: qk.clients.list,
    queryFn: () => relationshipApi.getMyClients(),
  });

  const clients = clientsData?.clients || [];

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      workoutPlanApi.assign(planId, { athleteIds: selectedIds.map(String) }),
    onSuccess: async () => {
      await revalidateWorkoutPlansCache();
      await queryClient.invalidateQueries({ queryKey: qk.plans.all });
      setSelectedIds([]);
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      ApiErrorHandler.handle(error);
    },
  });

  const toggleClient = (athleteId: number) => {
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
          <DialogTitle>{t('assign_plan_title')}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : clients.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('no_active_clients')}
          </p>
        ) : (
          <div className="space-y-3 py-2">
            {clients.map((client) => {
              const athleteId = client.athlete.userId;
              // athleteId is optional in generated type; skip if missing
              if (athleteId == null) return null;
              return (
                <div
                  key={athleteId}
                  className="flex items-center gap-3"
                >
                  <Checkbox
                    id={String(athleteId)}
                    checked={selectedIds.includes(athleteId)}
                    onCheckedChange={() => toggleClient(athleteId)}
                  />
                  <Label
                    htmlFor={String(athleteId)}
                    className="cursor-pointer"
                  >
                    {client.athlete.profile?.name || client.athlete.username}
                  </Label>
                </div>
              );
            })}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onSuccess?.()}>
            {t('delete')}
          </Button>
          <Button
            onClick={() => mutate()}
            disabled={isPending || selectedIds.length === 0}
          >
            {isPending && <Loader2 className="mr-2 size-5 animate-spin" />}
            {t('assign_button', { count: selectedIds.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
