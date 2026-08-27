"use client"

import { useState } from "react"
import { coachingRequestApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

interface CoachingRequestDialogProps {
  trainerId: string | number
  trainerName: string
  onRequestSent?: () => void
  children: React.ReactNode
}

export function CoachingRequestDialog({ trainerId, trainerName, onRequestSent, children }: CoachingRequestDialogProps) {
  const t = useTranslations('coaching.request_dialog')
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      await coachingRequestApi.createCoachingRequest({
        trainerId: Number(trainerId),
        message: message.trim()
      })
      setOpen(false)
      setMessage("")
      onRequestSent?.()
    } catch (err: unknown) {
      const serverError =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined
      setError(serverError || t('error_fallback'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        {children}
      </DialogTrigger>
      <DialogContent className={cn("sm:max-w-md rounded-none border border-border shadow-none")}>
        <DialogHeader>
          <DialogTitle>{t('title', { trainerName })}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="message">{t('message_label')}</Label>
            <Textarea
              id="message"
              placeholder={t('message_placeholder')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1"
              rows={4}
            />
          </div>

          {error && (
            <div className="rounded-none border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="rounded-none border border-border bg-muted/50 p-3">
            <p className="text-sm font-[500] text-foreground">
              {t('what_happens_next')}
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              <li>{t('bullet_trainer_receives', { trainerName })}</li>
              <li>{t('bullet_accept_decline')}</li>
              <li>{t('bullet_connected')}</li>
              <li>{t('bullet_track')}</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-none"
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-none"
            >
              {submitting ? t('sending') : t('send_request')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
