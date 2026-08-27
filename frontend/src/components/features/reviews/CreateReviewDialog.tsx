"use client"

import * as React from "react"
import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { reviewApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { FieldInfo } from "@/components/ui/form-field"
import { Star } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

interface CreateReviewDialogProps {
  trainerId: string
  trainerName: string
  onReviewCreated?: () => void
  children: React.ReactNode
}

export function CreateReviewDialog({ trainerId, trainerName, onReviewCreated, children }: CreateReviewDialogProps) {
  const t = useTranslations('review.create')
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
      console.error("Failed to create review:", error)
      toast.add({
        type: "error",
        title: t('error_create'),
      })
    },
  })

  const renderStars = (currentRating: number, fieldValue: { handleChange: (value: number) => void }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => fieldValue.handleChange(star)}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          >
            <Star
              className={cn(
                "w-6 h-6 transition-colors",
                star <= currentRating
                  ? "fill-amber-500 text-amber-500"
                  : "text-muted-foreground hover:text-amber-400"
              )}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger >
        {children}
      </DialogTrigger>
      <DialogContent className={cn("sm:max-w-md rounded-none border border-border shadow-none")}>
        <DialogHeader>
          <DialogTitle>{t('title', { trainerName })}</DialogTitle>
          <DialogDescription>
            {t('description')}
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
                <Label htmlFor="rating">{t('rating')}</Label>
                <div className="mt-2">
                  {renderStars(field.state.value, field)}
                </div>
              </div>
            )}
          </form.Field>

          <form.Field name="comment">
            {(field) => (
              <div>
                <Label htmlFor="comment">{t('comment_label')}</Label>
                <Textarea
                  id="comment"
                  placeholder={t('comment_placeholder')}
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
              className="flex-1 rounded-none"
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-none"
            >
              {isPending ? t('submitting') : t('submit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
