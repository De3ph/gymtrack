"use client"

import { Button } from "@/components/ui/button"
import { relationshipApi } from "@/lib/api"
import { User } from "lucide-react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"

export function MyTrainerButton() {
  const router = useRouter()

  const { data: trainerData, isLoading } = useQuery({
    queryKey: ["myTrainer"],
    queryFn: relationshipApi.getMyTrainer,
    refetchOnWindowFocus: false,
  })

  if (isLoading) {
    return (
      <Button variant="outline" disabled>
        <User className="mr-2 h-4 w-4" />
        Loading...
      </Button>
    )
  }

  if (!trainerData?.activeTrainer) {
    return null // Don't render if no active trainer
  }

  const handleClick = () => {
    if (trainerData?.activeTrainer) {
      router.push(`/athlete/trainer/${trainerData.activeTrainer.trainer.userId}`)
    }
  }

  return (
    <Button variant="outline" onClick={handleClick}>
      <User className="mr-2 h-4 w-4" />
      My Trainer
    </Button>
  )
}
