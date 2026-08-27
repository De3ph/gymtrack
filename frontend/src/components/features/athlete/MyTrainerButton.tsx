"use client"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { relationshipApi } from "@/lib/api"
import { User } from "lucide-react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { buildRoute } from "@/lib/routes"
import { useTranslations } from "next-intl"

export function MyTrainerButton() {
  const t = useTranslations('athlete.trainer')
  const tCommon = useTranslations('common')
  const router = useRouter()

  const { data: trainerData, isLoading } = useQuery({
    queryKey: ["myTrainer"],
    queryFn: relationshipApi.getMyTrainer,
    refetchOnWindowFocus: false,
  })

  if (isLoading) {
    return (
      <Button variant="outline" disabled className="rounded-none">
        <Spinner className="mr-2" />
        {tCommon('loading')}
      </Button>
    )
  }

  if (!trainerData?.activeTrainer) {
    return null // Don't render if no active trainer
  }

  const handleClick = () => {
    const trainerId = trainerData?.activeTrainer?.trainer.userId
    if (trainerId != null) {
      router.push(buildRoute('ATHLETE_TRAINER_DETAIL', trainerId))
    }
  }

  return (
    <Button variant="outline" onClick={handleClick} className="rounded-none">
      <User className="mr-2 h-4 w-4" aria-hidden="true" />
      {t('title')}
    </Button>
  )
}
