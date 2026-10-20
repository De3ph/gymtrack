"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { reviewApi } from "@/lib/api"
import { qk } from "@/lib/query-keys"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Star, Edit, Trash2 } from "lucide-react"
import { TrainerReview } from "@/types"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

interface ReviewActionsProps {
  review: TrainerReview
  currentUserId: string | number
  onReviewUpdated?: () => void
}

export function ReviewActions({ review, currentUserId, onReviewUpdated }: ReviewActionsProps) {
  const tEdit = useTranslations('review.edit')
  const tDelete = useTranslations('review.delete')
  const tCommon = useTranslations('common')
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [rating, setRating] = useState(review.rating)
  const [comment, setComment] = useState(review.comment || "")
  const [error, setError] = useState("")

  const isOwner = review.athleteId === currentUserId

  const editMutation = useMutation({
    mutationFn: (data: { rating: number; comment: string }) =>
      reviewApi.updateReview(review.reviewId!, data),
    onSuccess: () => {
      setEditOpen(false)
      setError("")
      queryClient.invalidateQueries({ queryKey: qk.reviews.all })
      onReviewUpdated?.()
    },
    onError: (err: unknown) => {
      const serverError =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined
      setError(serverError || tEdit('error_update'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => reviewApi.deleteReview(review.reviewId!),
    onSuccess: () => {
      setDeleteOpen(false)
      setError("")
      queryClient.invalidateQueries({ queryKey: qk.reviews.all })
      onReviewUpdated?.()
    },
    onError: (err: unknown) => {
      const serverError =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined
      setError(serverError || tEdit('error_delete'))
    },
  })
  const submitting = editMutation.isPending || deleteMutation.isPending

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    editMutation.mutate({ rating, comment })
  }

  const handleDelete = () => {
    setError("")
    deleteMutation.mutate()
  }

  const renderStars = (currentRating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
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

  if (!isOwner) {
    return null
  }

  return (
    <>
      <div className="flex gap-2">
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger
            render={
              <Button variant="outline" size="sm" className="rounded-none">
                <Edit className="w-4 h-4 mr-1" aria-hidden="true" />
                {tCommon('actions.edit')}
              </Button>
            }
          />
          <DialogContent className={cn("sm:max-w-md rounded-none border border-border shadow-none")}>
            <DialogHeader>
              <DialogTitle>{tEdit('title')}</DialogTitle>
              <DialogDescription>
                {tEdit('description')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <Label htmlFor="rating">{tEdit('rating')}</Label>
                <div className="mt-2">
                  {renderStars(rating)}
                </div>
              </div>

              <div>
                <Label htmlFor="comment">{tEdit('comment')}</Label>
                <Textarea
                  id="comment"
                  placeholder={tEdit('comment_placeholder')}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="mt-1"
                  rows={4}
                />
              </div>

              {error && (
                <div className="rounded-none border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                  className="flex-1 rounded-none"
                >
                  {tEdit('cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-none"
                >
                  {submitting ? tEdit('updating') : tEdit('update')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger
            render={
              <Button variant="destructive" size="sm" className="rounded-none">
                <Trash2 className="w-4 h-4 mr-1" aria-hidden="true" />
                {tCommon('actions.delete')}
              </Button>
            }
          />
          <DialogContent className={cn("sm:max-w-md rounded-none border border-border shadow-none")}>
            <DialogHeader>
              <DialogTitle>{tDelete('title')}</DialogTitle>
              <DialogDescription>
                {tDelete('description')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <p>{tDelete('confirm_text')}</p>

              {error && (
                <div className="rounded-none border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteOpen(false)}
                  className="flex-1 rounded-none"
                >
                  {tDelete('cancel')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={submitting}
                  className="flex-1 rounded-none"
                >
                  {submitting ? tDelete('deleting') : tDelete('title')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
