"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { ClientWithAthlete } from "@/types";
import { Eye, Users } from "lucide-react";
import { formatDate } from "@/lib/i18n/dayjs";
import * as m from "motion/react-m";
import { staggerItem } from "@/lib/animations";
import { useTranslations } from "next-intl"

interface ClientCardProps {
  client: ClientWithAthlete;
  onViewClient: (clientId: string) => void;
}

export const ClientCard = memo(function ClientCardImpl({ client, onViewClient }: ClientCardProps) {
  const t = useTranslations("trainer.clients")
  const tCommon = useTranslations("common.actions")

  return (
    <m.div
      key={client.relationship?.relationshipId}
      variants={staggerItem}
    >
      <div className="rounded-none border border-border">
        <div className="px-6 py-4 border-b border-border">
          <h3 className='flex items-center gap-2 text-base font-[500] text-foreground'>
            <Users className='h-5 w-5' aria-hidden="true" />
            {client.athlete?.profile?.name || t('unknown_athlete')}
          </h3>
          <p className='text-sm text-muted-foreground mt-1'>{client.athlete?.email}</p>
        </div>
        <div className="p-6">
          <div className='mb-4 space-y-2 text-sm'>
            {client.athlete?.profile?.fitnessGoals && (
              <p className='text-muted-foreground line-clamp-2'>
                {t("goals")}: {client.athlete.profile.fitnessGoals}
              </p>
            )}
            <p className='text-xs text-muted-foreground'>
              {t("client_since")}{" "}
              {client.relationship?.createdAt
                ? formatDate(client.relationship.createdAt, "DD/MM/YYYY")
                : tCommon('not_set')}
            </p>
          </div>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              className='flex-1 rounded-none'
              onClick={() => onViewClient(client.athlete?.username || "")}
            >
              <Eye className='mr-2 size-5' aria-hidden="true" />
              {tCommon("view_client")}
            </Button>
          </div>
        </div>
      </div>
    </m.div>
  )
})
