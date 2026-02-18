"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
import { relationshipApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Calendar, Mail, Award, Users } from "lucide-react"
import type { User } from "@/types"

export default function TrainerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const trainerId = params.id as string

  const { data: trainerData, isLoading, error } = useQuery({
    queryKey: ["myTrainer"],
    queryFn: relationshipApi.getMyTrainer,
    enabled: !!trainerId,
  })

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading trainer details...</div>
      </div>
    )
  }

  if (error || !trainerData?.activeTrainer || trainerData.activeTrainer.trainer.userId !== trainerId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-600">
          Trainer not found or you don't have access to view this profile.
        </div>
      </div>
    )
  }

  const trainer = trainerData.activeTrainer.trainer
  const relationship = trainerData.activeTrainer.relationship

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          My Trainer
        </h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Trainer Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Trainer Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                Name
              </label>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {trainer.profile.name}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                Email
              </label>
              <div className="mt-1 flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <p className="text-gray-900 dark:text-white">{trainer.email}</p>
              </div>
            </div>

            {trainer.profile.certifications && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                  Certifications
                </label>
                <div className="mt-1 flex items-start gap-2">
                  <Award className="h-4 w-4 text-gray-400 mt-0.5" />
                  <p className="text-gray-900 dark:text-white">
                    {trainer.profile.certifications}
                  </p>
                </div>
              </div>
            )}

            {trainer.profile.specializations && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                  Specializations
                </label>
                <p className="mt-1 text-gray-900 dark:text-white">
                  {trainer.profile.specializations}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Relationship Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Relationship Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                Status
              </label>
              <p className="mt-1">
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                  Active
                </span>
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                Connected Since
              </label>
              <p className="mt-1 text-gray-900 dark:text-white">
                {new Date(relationship.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                Relationship ID
              </label>
              <p className="mt-1 text-sm font-mono text-gray-600 dark:text-gray-400">
                {relationship.relationshipId}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex gap-4">
        <Button
          variant="outline"
          onClick={() => router.push("/athlete/workouts")}
        >
          View My Workouts
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/athlete/meals")}
        >
          View My Meals
        </Button>
      </div>
    </div>
  )
}
