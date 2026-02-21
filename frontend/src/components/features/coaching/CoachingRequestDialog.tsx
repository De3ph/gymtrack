"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { coachingRequestApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface CoachingRequestDialogProps {
  trainerId: string
  trainerName: string
  onRequestSent?: () => void
  children: React.ReactNode
}

export function CoachingRequestDialog({ trainerId, trainerName, onRequestSent, children }: CoachingRequestDialogProps) {
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
        message: message.trim() || `I would like to request coaching from ${trainerName}.`
      })
      setOpen(false)
      setMessage("")
      onRequestSent?.()
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to send coaching request")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Coaching from {trainerName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="message">Message to Trainer (optional)</Label>
            <Textarea
              id="message"
              placeholder="Introduce yourself and explain why you'd like to work with this trainer..."
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
              <strong>What happens next:</strong>
            </p>
            <ul className="text-sm text-gray-600 mt-2 space-y-1">
              <li>• {trainerName} will receive your request</li>
              <li>• They can accept or decline your request</li>
              <li>• If accepted, you'll be connected as trainer-athlete</li>
              <li>• You can then start tracking workouts and meals together</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? "Sending..." : "Send Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
