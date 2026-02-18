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

interface AcceptInvitationDialogProps {
  onSuccess?: () => void
}

export function AcceptInvitationDialog({ onSuccess }: AcceptInvitationDialogProps) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const sanitizeInvitationCode = (input: string): string => {
    // Remove any non-alphanumeric characters (preserve case)
    return input.replace(/[^a-zA-Z0-9]/g, '');
  };

  const validateInvitationCode = (code: string): boolean => {
    // Code must be exactly 8 alphanumeric characters (accept both upper and lower case)
    return /^[a-zA-Z0-9]{8}$/.test(code);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const sanitizedCode = sanitizeInvitationCode(code);

    if (!validateInvitationCode(sanitizedCode)) {
      setError("Invitation code must be exactly 8 alphanumeric characters (A-Z, a-z, 0-9)")
      return
    }

    try {
      setLoading(true)
      setError(null)
      await relationshipApi.acceptInvitation(sanitizedCode)
      setSuccess(true)
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
        setCode("")
        onSuccess?.()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation")
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!loading) {
      setOpen(newOpen)
      if (!newOpen) {
        setCode("")
        setError(null)
        setSuccess(false)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="mr-2 h-4 w-4" />
          Connect with Trainer
        </Button>
      </DialogTrigger>
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invitation-code">Invitation Code</Label>
              <Input
                id="invitation-code"
                value={code}
                onChange={(e) => setCode(sanitizeInvitationCode(e.target.value))}
                placeholder="Enter 8-character code (case-sensitive)"
                maxLength={8}
                className="font-mono text-lg tracking-wider"
              />
              <p className="text-xs text-muted-foreground">
                The code should be 8 characters long (e.g., a1b2c3d4 or A1B2C3D4)
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading || !validateInvitationCode(code)} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect with Trainer"
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
