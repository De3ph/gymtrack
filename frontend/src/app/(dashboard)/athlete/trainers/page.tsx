"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { trainerCatalogApi } from "@/lib/api"
import { TrainerWithProfile } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export default function TrainerCatalogPage() {
  const [trainers, setTrainers] = useState<TrainerWithProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState({
    specialization: "",
    location: "",
    minRating: 0
  })

  useEffect(() => {
    loadTopTrainers()
  }, [])

  const loadTopTrainers = async () => {
    setLoading(true)
    try {
      const response = await trainerCatalogApi.searchTrainers({
        limit: 5
      })
      setTrainers(response.trainers)
    } catch (error) {
      console.error("Failed to load top trainers:", error)
    } finally {
      setLoading(false)
    }
  }

  const searchTrainers = async () => {
    setLoading(true)
    try {
      const response = await trainerCatalogApi.searchTrainers({
        specialization: filters.specialization || undefined,
        location: filters.location || undefined,
        minRating: filters.minRating || undefined
      })
      setTrainers(response.trainers)
    } catch (error) {
      console.error("Failed to search trainers:", error)
    } finally {
      setLoading(false)
    }
  }

  const renderStars = (rating: number) => {
    return "★".repeat(Math.floor(rating)) + "☆".repeat(5 - Math.floor(rating))
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2">Top Trainers</h1>
      <p className="text-gray-600 mb-8">Discover the highest-rated trainers on our platform</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="specialization">Specialization</Label>
                <Input
                  id="specialization"
                  placeholder="e.g., Weight Loss"
                  value={filters.specialization}
                  onChange={(e) =>
                    setFilters({ ...filters, specialization: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., New York"
                  value={filters.location}
                  onChange={(e) =>
                    setFilters({ ...filters, location: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="minRating">Min Rating</Label>
                <Input
                  id="minRating"
                  type="number"
                  min="0"
                  max="5"
                  step="0.5"
                  value={filters.minRating}
                  onChange={(e) =>
                    setFilters({ ...filters, minRating: parseFloat(e.target.value) })
                  }
                />
              </div>
              <Button onClick={searchTrainers} className="w-full">
                Search
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : trainers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No trainers found. Try adjusting your filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trainers.map((trainer) => (
                <Link key={trainer.userId} href={`/athlete/trainers/${trainer.userId}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <CardHeader>
                      <CardTitle>{trainer.profile.name}</CardTitle>
                      <p className="text-sm text-gray-500">{trainer.email}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {trainer.profile.specializations && (
                          <div>
                            <span className="font-medium">Specializations:</span>{" "}
                            {trainer.profile.specializations}
                          </div>
                        )}
                        {trainer.profile.certifications && (
                          <div>
                            <span className="font-medium">Certifications:</span>{" "}
                            {trainer.profile.certifications}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Rating:</span>
                          <span className="text-yellow-500">
                            {renderStars(trainer.averageRating || 0)}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({trainer.reviewCount || 0} reviews)
                          </span>
                        </div>
                        {trainer.trainerProfile?.hourlyRate && (
                          <div>
                            <span className="font-medium">Hourly Rate:</span> $
                            {trainer.trainerProfile.hourlyRate}
                          </div>
                        )}
                        {trainer.trainerProfile?.isAvailableForNewClients && (
                          <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                            Available for New Clients
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
