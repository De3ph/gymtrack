"use client"

import * as React from "react"
import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { reviewApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Field } from "@/components/ui/field"
import { FieldInfo } from "@/components/ui/form-field"
import { Star } from "lucide-react"

interface CreateReviewDialogProps {
  trainerId: string
  trainerName: string
  onReviewCreated?: () => void
  children: React.ReactNode
}

export function CreateReviewDialog({ trainerId, trainerName, onReviewCreated, children }: CreateReviewDialogProps) {
  const [open, setOpen] = React.useState(false)
  const queryClient = useQueryClient()

  const form = useForm({
    defaultValues: {
      rating: 5,
      comment: "",
    },
    onSubmit: async ({ value }) => {
      createReview(value)
    },
  })

  const { mutate: createReview, isPending } = useMutation({
    mutationFn: async (data: { rating: number; comment: string }) => {
      return reviewApi.createReview(trainerId, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] })
      setOpen(false)
      form.reset()
      onReviewCreated?.()
    },
    onError: (error) => {
      // TODO: Show toast notification with error message
      console.error("Failed to create review:", error)
    },
  })

  const renderStars = (currentRating: number, fieldValue: any) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => fieldValue.handleChange(star)}
            className="focus:outline-none"
          >
            <Star
              className={`w-6 h-6 transition-colors ${star <= currentRating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300 hover:text-yellow-200"
                }`}
            />
          </button>
        ))}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Write a Review for {trainerName}</DialogTitle>
          <DialogDescription>
            Share your experience working with this trainer to help others make informed decisions
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="space-y-4"
        >
          <form.Field name="rating">
            {(field) => (
              <div>
                <Label htmlFor="rating">Rating</Label>
                <div className="mt-2">
                  {renderStars(field.state.value, field)}
                </div>
              </div>
            )}
          </form.Field>

          <form.Field name="comment">
            {(field) => (
              <div>
                <Label htmlFor="comment">Comment (optional)</Label>
                <Textarea
                  id="comment"
                  placeholder="Share your experience with this trainer..."
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="mt-1"
                  rows={4}
                />
                <FieldInfo field={field} />
              </div>
            )}
          </form.Field>

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
              disabled={isPending}
              className="flex-1"
            >
              {isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
