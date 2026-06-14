"use client"

import { CoachingRequestsList } from "@/components/features/coaching/CoachingRequestsList"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ROUTES } from "@/lib/routes"
import { useTranslations } from 'next-intl'

export default function MyCoachingRequestsPage() {
  const t = useTranslations('athlete.requests')

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
        <p className="text-gray-600">
          {t('description')}
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('looking_for_trainers')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            {t('browse_description')}
          </p>
          <Link href={ROUTES.ATHLETE_TRAINERS}>
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
              {t('browse_trainers')}
            </button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('your_requests')}</CardTitle>
        </CardHeader>
        <CardContent>
          <CoachingRequestsList userType="athlete" />
        </CardContent>
      </Card>
    </div>
  )
}
