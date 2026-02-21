"use client"

import { CoachingRequestsList } from "@/components/features/coaching/CoachingRequestsList"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function MyCoachingRequestsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Coaching Requests</h1>
        <p className="text-gray-600">
          Track the status of your coaching requests and see responses from trainers
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Looking for Trainers?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Browse our catalog of qualified trainers and send them coaching requests.
          </p>
          <Link href="/athlete/trainers">
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
              Browse Trainers
            </button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <CoachingRequestsList userType="athlete" />
        </CardContent>
      </Card>
    </div>
  )
}
