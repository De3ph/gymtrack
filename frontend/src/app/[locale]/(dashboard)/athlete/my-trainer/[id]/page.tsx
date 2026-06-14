"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { relationshipApi } from "@/lib/api";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { RelationshipDetailsCard } from "@/components/features/trainer/RelationshipDetailsCard";
import { MyTrainerProfile } from "@/components/features/trainer/MyTrainerProfile";
import type { User } from "@/types";
import { ROUTES } from "@/lib/routes";
import { useTranslations } from "next-intl";

export default function TrainerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const trainerId = params.id as string;
  const t = useTranslations('athlete.trainer');
  const tc = useTranslations('common.actions');

  const {
    data: trainerData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["myTrainer"],
    queryFn: relationshipApi.getMyTrainer,
    enabled: !!trainerId,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">{t('loading')}</div>
      </div>
    );
  }

  if (
    error ||
    !trainerData?.activeTrainer ||
    trainerData.activeTrainer.trainer.userId !== trainerId
  ) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-600">
          {t('not_found_or_access')}
        </div>
      </div>
    );
  }

  const trainer = trainerData.activeTrainer.trainer;
  const relationship = trainerData.activeTrainer.relationship;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tc('back')}
        </Button>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('title')}
        </h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <MyTrainerProfile trainer={trainer} />

        <RelationshipDetailsCard relationship={relationship} />
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex gap-4">
        <Button
          variant="outline"
          onClick={() => router.push(ROUTES.ATHLETE_WORKOUTS)}
        >
          {t('view_workouts')}
        </Button>
        <Button variant="outline" onClick={() => router.push(ROUTES.ATHLETE_MEALS)}>
          {t('view_meals')}
        </Button>
      </div>
    </div>
  );
}
