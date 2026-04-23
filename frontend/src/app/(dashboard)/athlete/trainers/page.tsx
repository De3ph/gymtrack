"use client"

import { useState, useEffect, useTransition } from "react"
import Link from "next/link"
import { trainerCatalogApi } from "@/lib/api"
import { TrainerWithProfile } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { motion } from "motion/react"
import { staggerContainer, staggerItem } from "@/lib/animations"
import TrainerCatalogCard from "@/components/features/trainer/TrainerCatalogCard"

export default function TrainerCatalogPage() {
  const [trainers, setTrainers] = useState<TrainerWithProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState({
    specialization: "",
    location: "",
    minRating: 0
  })
  const [isPending, startTransition] = useTransition()

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
                    startTransition(() => {
                      setFilters({ ...filters, specialization: e.target.value })
                    })
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
                    startTransition(() => {
                      setFilters({ ...filters, location: e.target.value })
                    })
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
                    startTransition(() => {
                      setFilters({ ...filters, minRating: parseFloat(e.target.value) })
                    })
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
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {trainers.map((trainer) => (
                <motion.div key={trainer.userId} variants={staggerItem}>
                  <TrainerCatalogCard trainer={trainer} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
