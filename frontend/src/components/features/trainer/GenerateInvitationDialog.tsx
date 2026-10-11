"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { relationshipApi } from "@/lib/api";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Loader2, RefreshCw } from "lucide-react";
import { TIME_LIMITS } from "@/lib/constants";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface GenerateInvitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GenerateInvitationDialog({
  open,
  onOpenChange,
}: GenerateInvitationDialogProps) {
  const t = useTranslations('trainer.generate_invitation')
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);

  // Generating an invitation code only affects local dialog state — no query
  // reads invitation data, so no cache invalidation is needed here.
  const generateMutation = useMutation({
    mutationFn: () => relationshipApi.generateInvitation(),
    onSuccess: (response) => {
      setError(null);
      setCode(response.invitation.code);
      setExpiresAt(response.invitation.expiresAt);
    },
    onError: (err) => {
      setError(
        err instanceof Error
          ? err.message
          : t('error_fallback'),
      );
    },
  });
  const loading = generateMutation.isPending;

  const generateCode = () => {
    generateMutation.mutate();
  };

  const copyToClipboard = async () => {
    if (code) {
      try {
        setCopying(true);
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), TIME_LIMITS.COPY_FEEDBACK_MS);
      } catch (err) {
        console.error("Failed to copy to clipboard:", err);
        // Optionally show error message to user
      } finally {
        setCopying(false);
      }
    }
  };

  const handleClose = () => {
    setCode(null);
    setExpiresAt(null);
    setError(null);
    setCopied(false);
    setCopying(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn("sm:max-w-md rounded-none border border-border shadow-none")}>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!code ? (
            <div className="flex flex-col items-center space-y-4 py-4">
              <p className="text-center text-sm text-muted-foreground">
                {t('instruction')}
              </p>
              <Button onClick={generateCode} disabled={loading} size="lg" className="rounded-none">
                {loading ? (
                  <Loader2 className="mr-2 size-5 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="mr-2 size-5" aria-hidden="true" />
                )}
                {t('generate_code_button')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invitation-code">{t('code_label')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="invitation-code"
                    value={code}
                    readOnly
                    className="font-mono text-lg tracking-wider"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                    disabled={copying}
                    className="shrink-0 rounded-none"
                  >
                    {copying ? (
                      <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                    ) : copied ? (
                      <Check className="size-5 text-accent" aria-hidden="true" />
                    ) : (
                      <Copy className="size-5" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </div>

              {expiresAt && (
                <p className="text-sm text-muted-foreground">
                  {t('expires_on', { date: dayjs(expiresAt).format("MMM D, YYYY") })} {t('expires_at', { time: dayjs(expiresAt).format("h:mm A") })}
                </p>
              )}

              <div className="rounded-none border border-border bg-muted p-4">
                <p className="text-sm">
                  <span className="font-[500]">{t('instructions_text')}</span> {t('instruction')}
                </p>
              </div>

              <Button
                variant="outline"
                onClick={generateCode}
                disabled={loading}
                className="w-full rounded-none"
              >
                {loading ? (
                  <Loader2 className="mr-2 size-5 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="mr-2 size-5" aria-hidden="true" />
                )}
                {t('generate_new_code')}
              </Button>
            </div>
          )}

          {error && (
            <div className="rounded-none border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
