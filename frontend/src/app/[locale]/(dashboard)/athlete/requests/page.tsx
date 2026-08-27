"use client"

import { CoachingRequestsList } from "@/components/features/coaching/CoachingRequestsList"
import Link from "next/link"
import { ROUTES } from "@/lib/routes"
import { useTranslations } from 'next-intl'
import { buttonVariants } from "@/components/ui/button"
import { ArrowUpRight } from "lucide-react"

export default function MyCoachingRequestsPage() {
  const t = useTranslations('athlete.requests')

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="font-mono text-3xl font-normal leading-none tracking-[-0.04em] text-foreground">
          {t('title')}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {t('description')}
        </p>
      </div>

      <section className="mb-6 rounded-none border border-border">
        <header className="border-b border-border px-6 py-4">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {t('looking_for_trainers')}
          </h2>
        </header>
        <div className="px-6 py-6">
          <p className="mb-4 text-sm text-muted-foreground">
            {t('browse_description')}
          </p>
          <Link
            href={ROUTES.ATHLETE_TRAINERS}
            className={buttonVariants({
              variant: "outline",
              className: "rounded-none font-mono text-xs uppercase tracking-[0.18em]",
            })}
          >
            {t('browse_trainers')}
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="rounded-none border border-border">
        <header className="border-b border-border px-6 py-4">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {t('your_requests')}
          </h2>
        </header>
        <div className="px-6 py-6">
          <CoachingRequestsList userType="athlete" />
        </div>
      </section>
    </div>
  )
}
