import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { relationshipApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { ROUTES } from "@/lib/routes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface TerminateRelationshipDialogProps {
  clientId: string | number;
  athleteName?: string;
  trigger?: React.ReactNode;
}

export function TerminateRelationshipDialog({
  clientId,
  athleteName,
  trigger,
}: TerminateRelationshipDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [terminateError, setTerminateError] = useState<string | null>(null);
  const t = useTranslations("trainer.client_detail.terminate_dialog");
  const tClients = useTranslations("trainer.clients");

  const terminateMutation = useMutation({
    mutationFn: () => relationshipApi.terminateRelationship(clientId),
    onSuccess: () => {
      setTerminateError(null);
      setOpen(false);
      // The clients list, the dashboard summary and the client detail
      // payload all read different views of the same resource — the
      // `clients` prefix refreshes them all in one call.
      queryClient.invalidateQueries({ queryKey: qk.clients.all });
      router.push(ROUTES.TRAINER_CLIENTS);
    },
    onError: (err) => {
      setTerminateError(err instanceof Error ? err.message : t("error"));
    },
  });

  const handleTerminate = () => {
    terminateMutation.mutate();
  };

  if (trigger) {
    return (
      <>
        <div onClick={() => setOpen(true)}>{trigger}</div>
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent className={cn("rounded-none border border-border shadow-none")}>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("title")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("description", {
                  name: athleteName || tClients("this_athlete"),
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {terminateError && (
              <div className="rounded-none border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                {terminateError}
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-none">{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleTerminate}
                className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t("confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className={cn("rounded-none border border-border shadow-none")}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("description", { name: athleteName || tClients("this_athlete") })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {terminateError && (
          <div className="rounded-none border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            {terminateError}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-none">{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleTerminate}
            className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
