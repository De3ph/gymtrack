"use client"

import { CoachingRequestsList } from "@/components/features/coaching/CoachingRequestsList"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslations } from "next-intl"

export default function CoachingRequestsPage() {
  const t = useTranslations('trainer.requests')

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
        <p className="text-gray-600">
          {t('description')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('pending_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <CoachingRequestsList userType="trainer" />
        </CardContent>
      </Card>
    </div>
  )
}
