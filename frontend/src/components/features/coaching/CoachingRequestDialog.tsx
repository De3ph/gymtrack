"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { coachingRequestApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useTranslations } from "next-intl"

interface CoachingRequestDialogProps {
  trainerId: string
  trainerName: string
  onRequestSent?: () => void
  children: React.ReactNode
}

export function CoachingRequestDialog({ trainerId, trainerName, onRequestSent, children }: CoachingRequestDialogProps) {
  const t = useTranslations('coaching.request_dialog')
  const tCommon = useTranslations('common.actions')
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
        trainerId,
        message: message.trim()
      })
      setOpen(false)
      setMessage("")
      onRequestSent?.()
    } catch (err: any) {
      setError(err.response?.data?.error || t('error_fallback'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
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
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>{t('what_happens_next')}</strong>
            </p>
            <ul className="text-sm text-gray-600 mt-2 space-y-1">
              <li>• {t('bullet_trainer_receives', { trainerName })}</li>
              <li>• {t('bullet_accept_decline')}</li>
              <li>• {t('bullet_connected')}</li>
              <li>• {t('bullet_track')}</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? t('sending') : t('send_request')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
