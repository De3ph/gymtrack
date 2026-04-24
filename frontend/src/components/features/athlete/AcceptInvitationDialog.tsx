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

interface AcceptInvitationDialogProps {
  onSuccess?: () => void
}

export function AcceptInvitationDialog({ onSuccess }: AcceptInvitationDialogProps) {
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
      return "Invitation code must contain only letters and numbers"
    }
    if (value.length > 0 && value.length < 8) {
      return `Invitation code must be exactly 8 characters (${value.length}/8)`
    }
    return undefined
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <UserPlus className="mr-2 h-4 w-4" />
            Connect with Trainer
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect with Trainer</DialogTitle>
          <DialogDescription>
            Enter the invitation code provided by your trainer to connect with them.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center space-y-4 py-6">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-center font-medium">Successfully connected with your trainer!</p>
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
                  <Label htmlFor="invitation-code">Invitation Code</Label>
                  <Input
                    id="invitation-code"
                    value={field.state.value}
                    onChange={(e) => {
                      const sanitized = sanitizeInvitationCode(e.target.value)
                      field.handleChange(sanitized)
                    }}
                    placeholder="Enter 8-character code (case-sensitive)"
                    maxLength={8}
                    className="font-mono text-lg tracking-wider"
                  />
                  <p className="text-xs text-muted-foreground">
                    The code should be 8 characters long (e.g., a1b2c3d4 or A1B2C3D4)
                  </p>
                  {field.state.meta.errors.length > 0 && (
                    <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                      {field.state.meta.errors[0]}
                    </div>
                  )}
                </div>
              )}
            </form.Field>

            {error && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
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
                  className="w-full"
                >
                  {loading || isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Connect with Trainer"
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
