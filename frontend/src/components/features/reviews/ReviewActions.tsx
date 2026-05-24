"use client"

import { useState } from "react"
import { reviewApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Star, Edit, Trash2 } from "lucide-react"
import { TrainerReview } from "@/types"
import { useTranslations } from "next-intl"

interface ReviewActionsProps {
  review: TrainerReview
  trainerId: string
  currentUserId: string
  onReviewUpdated?: () => void
}

export function ReviewActions({ review, trainerId, currentUserId, onReviewUpdated }: ReviewActionsProps) {
  const tEdit = useTranslations('review.edit')
  const tDelete = useTranslations('review.delete')
  const tCommon = useTranslations('common')
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [rating, setRating] = useState(review.rating)
  const [comment, setComment] = useState(review.comment || "")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const isOwner = review.athleteId === currentUserId

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      await reviewApi.updateReview(review.reviewId, { rating, comment })
      setEditOpen(false)
      onReviewUpdated?.()
    } catch (err: any) {
      setError(err.response?.data?.error || tEdit('error_update'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setSubmitting(true)
    setError("")

    try {
      await reviewApi.deleteReview(review.reviewId)
      setDeleteOpen(false)
      onReviewUpdated?.()
    } catch (err: any) {
      setError(err.response?.data?.error || tEdit('error_delete'))
    } finally {
      setSubmitting(false)
    }
  }

  const renderStars = (currentRating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
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

  if (!isOwner) {
    return null
  }

  return (
    <>
      <div className="flex gap-2">
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger >
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-1" />
              {tCommon('actions.edit')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
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
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                  className="flex-1"
                >
                  {tEdit('cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? tEdit('updating') : tEdit('update')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger >
            <Button variant="destructive" size="sm">
              <Trash2 className="w-4 h-4 mr-1" />
              {tCommon('actions.delete')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{tDelete('title')}</DialogTitle>
              <DialogDescription>
                {tDelete('description')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <p>{tDelete('confirm_text')}</p>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteOpen(false)}
                  className="flex-1"
                >
                  {tDelete('cancel')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={submitting}
                  className="flex-1"
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
