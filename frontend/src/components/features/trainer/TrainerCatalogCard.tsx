import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { buildRoute } from "@/lib/routes"
import { TrainerWithProfile } from "@/types"
import Link from "next/link"

type PropTypes = {
    trainer: TrainerWithProfile
}

const renderStars = (rating: number) => {
    return "★".repeat(Math.floor(rating)) + "☆".repeat(5 - Math.floor(rating))
}

const TrainerCatalogCard = ({ trainer }: PropTypes) => {
    return (
        <Link href={buildRoute('ATHLETE_TRAINERS_DETAIL', trainer.userId)}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                    <CardTitle>{trainer.profile.name}</CardTitle>
                    <p className="text-sm text-gray-500">{trainer.email}</p>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {trainer.profile.specializations && (
                            <div>
                                <span className="font-medium">Specializations:</span>{" "}
                                {trainer.profile.specializations}
                            </div>
                        )}
                        {trainer.profile.certifications && (
                            <div>
                                <span className="font-medium">Certifications:</span>{" "}
                                {trainer.profile.certifications}
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <span className="font-medium">Rating:</span>
                            <span className="text-yellow-500">
                                {renderStars(trainer.averageRating || 0)}
                            </span>
                            <span className="text-sm text-gray-500">
                                ({trainer.reviewCount || 0} reviews)
                            </span>
                        </div>
                        {trainer.trainerProfile?.hourlyRate && (
                            <div>
                                <span className="font-medium">Hourly Rate:</span> $
                                {trainer.trainerProfile.hourlyRate}
                            </div>
                        )}
                        {trainer.trainerProfile?.isAvailableForNewClients && (
                            <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                Available for New Clients
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}

export default TrainerCatalogCard