import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { TrainerWithProfile } from "@/types";
import { ROUTES } from "@/lib/routes";
import { useTranslations } from 'next-intl';
import Link from "next/link"

type PropTypes = {
    trainer: TrainerWithProfile
}

const renderStars = (rating: number) => {
    return "★".repeat(Math.floor(rating)) + "☆".repeat(5 - Math.floor(rating))
}

export function TrainerCatalogCard({ trainer }: PropTypes) {
    const t = useTranslations('trainer.catalog');
    const tCommon = useTranslations('common');

    return (
        <Link href={`${ROUTES.ATHLETE_TRAINERS}/${trainer.userId}`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                    <CardTitle>{trainer.profile.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{trainer.email}</p>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {trainer.profile.specializations && (
                            <div>
                                <span className="font-medium">{t('specializations')}:</span>{" "}
                                {trainer.profile.specializations}
                            </div>
                        )}
                        {trainer.profile.certifications && (
                            <div>
                                <span className="font-medium">{t('certifications')}:</span>{" "}
                                {trainer.profile.certifications}
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <span className="font-medium">{t('rating')}:</span>
                            <span className="text-yellow-500">
                                {renderStars(trainer.averageRating || 0)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                                ({trainer.reviewCount || 0} {t('reviews')})
                            </span>
                        </div>
                        {trainer.trainerProfile?.hourlyRate && (
                            <div>
                                <span className="font-medium">{t('hourly_rate')}:</span> $
                                {trainer.trainerProfile.hourlyRate}
                            </div>
                        )}
                        {trainer.trainerProfile?.isAvailableForNewClients && (
                            <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded dark:bg-green-900/20 dark:text-green-400">
                                {tCommon('status.available')}
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}

export default TrainerCatalogCard