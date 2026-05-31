"use client";

import { useState } from "react";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);

  const generateCode = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await relationshipApi.generateInvitation();
      setCode(response.invitation.code);
      setExpiresAt(response.invitation.expiresAt);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('error_fallback'),
      );
    } finally {
      setLoading(false);
    }
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
      <DialogContent className="sm:max-w-md">
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
              <Button onClick={generateCode} disabled={loading} size="lg">
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
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
                    className="shrink-0"
                  >
                    {copying ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {expiresAt && (
                <p className="text-sm text-muted-foreground">
                  {t('expires_on', { date: dayjs(expiresAt).format("MMM D, YYYY") })} {t('expires_at', { time: dayjs(expiresAt).format("h:mm A") })}
                </p>
              )}

              <div className="rounded-lg border bg-muted p-4">
                <p className="text-sm">
                  <strong>{t('instructions_text')}</strong> {t('instruction')}
                </p>
              </div>

              <Button
                variant="outline"
                onClick={generateCode}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {t('generate_new_code')}
              </Button>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
