"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClientWithAthlete } from "@/lib/api/api-types";
import { Eye, Users } from "lucide-react";
import dayjs from "dayjs";
import { motion } from "motion/react";
import { staggerItem } from "@/lib/animations";
import { useTranslations } from "next-intl"

interface ClientCardProps {
  client: ClientWithAthlete;
  onViewClient: (clientId: string) => void;
}

export function ClientCard({ client, onViewClient }: ClientCardProps) {
  const t = useTranslations("trainer.clients")
  const tCommon = useTranslations("common.actions")

  return (
    <motion.div
      key={client.relationship?.relationshipId}
      variants={staggerItem}
    >
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Users className='h-5 w-5' />
            {client.athlete?.profile?.name || t('unknown_athlete')}
          </CardTitle>
          <CardDescription>{client.athlete?.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='mb-4 space-y-2 text-sm'>
            {client.athlete?.profile?.fitnessGoals && (
              <p className='text-muted-foreground line-clamp-2'>
                {t("goals")}: {client.athlete.profile.fitnessGoals}
              </p>
            )}
            <p className='text-xs text-muted-foreground'>
              {t("client_since")}{" "}
              {client.relationship?.createdAt
                ? dayjs(client.relationship.createdAt).format("DD/MM/YYYY")
                : tCommon('not_set')}
            </p>
          </div>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              className='flex-1'
              onClick={() => onViewClient(client.athlete?.username || "")}
            >
              <Eye className='mr-2 h-4 w-4' />
              {tCommon("view_client")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
