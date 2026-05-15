import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { useTranslations } from 'next-intl';

interface TerminateRelationshipDialogProps {
  clientId: string;
  athleteName?: string;
  trigger?: React.ReactNode;
}

export function TerminateRelationshipDialog({
  clientId,
  athleteName,
  trigger,
}: TerminateRelationshipDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [terminateError, setTerminateError] = useState<string | null>(null);
  const t = useTranslations('trainer.client_detail.terminate_dialog');

  const handleTerminateRelationship = async () => {
    try {
      setTerminateError(null);
      // Import here to avoid circular dependencies
      const { relationshipApi } = await import("@/lib/api");
      await relationshipApi.terminateRelationship(clientId);
      setOpen(false);
      router.push(ROUTES.TRAINER_CLIENTS);
    } catch (err) {
      setTerminateError(err instanceof Error ? err.message : t('error'));
    }
  };

  const handleTerminate = () => {
    handleTerminateRelationship();
  };

  if (trigger) {
    return (
      <>
        <div onClick={() => setOpen(true)}>
          {trigger}
        </div>
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('description', { name: athleteName || "this athlete" })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {terminateError && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                {terminateError}
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleTerminate}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t('confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('description', { name: athleteName || "this athlete" })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {terminateError && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            {terminateError}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleTerminate}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t('confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
