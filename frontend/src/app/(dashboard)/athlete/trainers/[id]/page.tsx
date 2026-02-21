"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { trainerCatalogApi, availabilityApi, reviewApi } from "@/lib/api"
import { TrainerWithProfile, TrainerAvailability, TrainerReview } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export default function TrainerProfilePage() {
  const params = useParams()
  const trainerId = params.id as string

  const [trainer, setTrainer] = useState<TrainerWithProfile | null>(null)
  const [availability, setAvailability] = useState<TrainerAvailability[]>([])
  const [reviews, setReviews] = useState<TrainerReview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trainerData, availabilityData, reviewsData] = await Promise.all([
          trainerCatalogApi.getTrainerProfile(trainerId),
          availabilityApi.getTrainerAvailability(trainerId),
          reviewApi.getTrainerReviews(trainerId)
        ])
        setTrainer(trainerData)
        setAvailability(availabilityData.slots ?? [])
        setReviews(reviewsData.reviews ?? [])
      } catch (error) {
        console.error("Failed to fetch trainer data:", error)
      } finally {
        setLoading(false)
      }
    }

    if (trainerId) {
      fetchData()
    }
  }, [trainerId])

  const renderStars = (rating: number) => {
    return "★".repeat(Math.floor(rating)) + "☆".repeat(5 - Math.floor(rating))
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":")
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  if (loading) {
    return <div className="container mx-auto py-8">Loading...</div>
  }

  if (!trainer) {
    return <div className="container mx-auto py-8">Trainer not found</div>
  }

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-3xl">{trainer.profile.name}</CardTitle>
              <p className="text-gray-500">{trainer.email}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-yellow-500 text-2xl">
                    {renderStars(trainer.averageRating || 0)}
                  </span>
                  <span className="text-gray-600">
                    {trainer.averageRating?.toFixed(1) || "0"} ({trainer.reviewCount || 0} reviews)
                  </span>
                </div>

                {trainer.trainerProfile?.hourlyRate && (
                  <div>
                    <span className="font-medium text-lg">Hourly Rate: </span>
                    <span className="text-xl">${trainer.trainerProfile.hourlyRate}</span>
                  </div>
                )}

                {trainer.trainerProfile?.bio && (
                  <div>
                    <h3 className="font-medium mb-2">About</h3>
                    <p className="text-gray-600">{trainer.trainerProfile.bio}</p>
                  </div>
                )}

                {trainer.profile.specializations && (
                  <div>
                    <h3 className="font-medium mb-2">Specializations</h3>
                    <p className="text-gray-600">{trainer.profile.specializations}</p>
                  </div>
                )}

                {trainer.profile.certifications && (
                  <div>
                    <h3 className="font-medium mb-2">Certifications</h3>
                    <p className="text-gray-600">{trainer.profile.certifications}</p>
                  </div>
                )}

                {trainer.trainerProfile?.yearsOfExperience && (
                  <div>
                    <span className="font-medium">Years of Experience: </span>
                    {trainer.trainerProfile.yearsOfExperience}
                  </div>
                )}

                {trainer.trainerProfile?.location && (
                  <div>
                    <span className="font-medium">Location: </span>
                    {trainer.trainerProfile.location}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              {reviews.length === 0 ? (
                <p className="text-gray-500">No reviews yet</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.reviewId} className="border-b pb-4 last:border-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-yellow-500">{renderStars(review.rating)}</span>
                        <span className="text-sm text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {review.comment && <p className="text-gray-600">{review.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Availability</CardTitle>
            </CardHeader>
            <CardContent>
              {availability.length === 0 ? (
                <p className="text-gray-500">No availability set</p>
              ) : (
                <div className="space-y-3">
                  {DAYS_OF_WEEK.map((day, index) => {
                    const daySlots = availability.filter((s) => s.dayOfWeek === index)
                    if (daySlots.length === 0) return null

                    return (
                      <div key={day}>
                        <h4 className="font-medium text-sm">{day}</h4>
                        <div className="text-sm text-gray-600">
                          {daySlots.map((slot) => (
                            <div key={slot.availabilityId}>
                              {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Button className="w-full mt-4">
            Request Coaching
          </Button>
        </div>
      </div>
    </div>
  )
}
