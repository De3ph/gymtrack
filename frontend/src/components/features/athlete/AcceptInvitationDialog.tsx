"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { relationshipApi } from "@/lib/api"
import { CheckCircle, Loader2, UserPlus } from "lucide-react"
import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

interface AcceptInvitationDialogProps {
  onSuccess?: () => void
}

export function AcceptInvitationDialog({ onSuccess }: AcceptInvitationDialogProps) {
  const t = useTranslations('athlete.invitation')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const form = useForm({
    defaultValues: {
      code: "",
    },
    onSubmit: async ({ value }) => {
      try {
        setLoading(true)
        setError(null)
        await relationshipApi.acceptInvitation(value.code)
        setSuccess(true)
        setTimeout(() => {
          setOpen(false)
          setSuccess(false)
          form.reset()
          onSuccess?.()
        }, 2000)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to accept invitation")
        setSuccess(false)
      } finally {
        setLoading(false)
      }
    },
  })

  const handleOpenChange = (newOpen: boolean) => {
    if (!loading) {
      setOpen(newOpen)
      if (!newOpen) {
        form.reset()
        setError(null)
        setSuccess(false)
      }
    }
  }

  // Sanitize input to only allow alphanumeric characters
  const sanitizeInvitationCode = (input: string): string => {
    return input.replace(/[^a-zA-Z0-9]/g, '')
  }

  const validateInvitationCode = ({ value }: { value: string }): string | undefined => {
    // Code must be exactly 8 alphanumeric characters
    if (!/^[a-zA-Z0-9]{8}$/.test(value) && value.length === 8) {
      return t('error_invalid_chars')
    }
    if (value.length > 0 && value.length < 8) {
      return t('error_length', { count: value.length })
    }
    return undefined
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" className="rounded-none">
            <UserPlus className="mr-2 size-5" aria-hidden="true" />
            {t('title')}
          </Button>
        }
      />
      <DialogContent className={cn("sm:max-w-md rounded-none border border-border shadow-none")}>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle className="size-5 text-accent" aria-hidden="true" />
            <p className="text-center text-sm font-[500] text-foreground">{t('success')}</p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
            className="space-y-4"
          >
            <form.Field
              name="code"
              validators={{
                onChange: validateInvitationCode,
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="invitation-code">{t('code_label')}</Label>
                  <Input
                    id="invitation-code"
                    value={field.state.value}
                    onChange={(e) => {
                      const sanitized = sanitizeInvitationCode(e.target.value)
                      field.handleChange(sanitized)
                    }}
                    placeholder={t('code_placeholder')}
                    maxLength={8}
                    className="font-mono text-xs uppercase tracking-[0.18em]"
                  />
                  <p className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
                    {t('code_hint')}
                  </p>
                  {field.state.meta.errors.length > 0 && (
                    <div className="rounded-none border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                      {field.state.meta.errors[0]}
                    </div>
                  )}
                </div>
              )}
            </form.Field>

            {error && (
              <div className="rounded-none border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  disabled={!canSubmit || loading || isSubmitting}
                  className="w-full rounded-none"
                >
                  {loading || isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 size-5 animate-spin" aria-hidden="true" />
                      {t('connecting')}
                    </>
                  ) : (
                    t('submit')
                  )}
                </Button>
              )}
            </form.Subscribe>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
