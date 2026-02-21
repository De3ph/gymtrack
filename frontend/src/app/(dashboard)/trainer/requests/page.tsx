"use client"

import { CoachingRequestsList } from "@/components/features/coaching/CoachingRequestsList"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CoachingRequestsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Coaching Requests</h1>
        <p className="text-gray-600">
          Manage coaching requests from athletes who want to work with you
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <CoachingRequestsList userType="trainer" />
        </CardContent>
      </Card>
    </div>
  )
}
