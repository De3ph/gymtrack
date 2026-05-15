"use client";

import PublicProfileCard from "@/components/features/trainer/public-profile/PublicProfileCard"
import AvailabilityCard from "@/components/features/trainer/AvailabilityCard"
import { useState } from "react";
import { useTranslations } from "next-intl";

export default function TrainerProfilePage() {
  const [message, setMessage] = useState("")
  const t = useTranslations('trainer.profile')

  return (
    <div className='container mx-auto py-8'>
      <h1 className='text-3xl font-bold mb-8'>{t('title')}</h1>

      {message && (
        <div
          className={`mb-4 p-3 rounded ${message.includes("Failed")
            ? "bg-red-100 text-red-800"
            : "bg-green-100 text-green-800"
            }`}
        >
          {message}
        </div>
      )}

      <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
        <PublicProfileCard onMessage={setMessage} />
        <AvailabilityCard onMessage={setMessage} />
      </div>
    </div>
  )
}
