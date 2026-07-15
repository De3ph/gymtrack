import Link from "next/link";
import { TrainerAvatar } from "./TrainerAvatar";
import { TrainerWithProfile } from "@/types";
import { DYNAMIC_ROUTES } from "@/lib/routes";
import { useTranslations } from "next-intl";

interface TrainerCatalogCardProps {
  trainer: TrainerWithProfile;
}

export function TrainerCatalogCard({ trainer }: TrainerCatalogCardProps) {
  const t = useTranslations("trainer.catalog");
  const tCommon = useTranslations("common");
  const tTrainers = useTranslations("athlete.trainers");

  const profile = trainer.trainerProfile;
  const rating = trainer.averageRating || 0;
  const reviewCount = trainer.reviewCount || 0;

  const primarySpecialty = trainer.profile.specializations
    ? trainer.profile.specializations.split(",")[0].trim()
    : undefined;

  return (
    <Link
      href={DYNAMIC_ROUTES.ATHLETE_TRAINERS_DETAIL(trainer.userId)}
      className="group relative block rounded-xl border border-border bg-card p-5 outline-none transition-colors hover:bg-card/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-safe:hover:-translate-y-0.5 motion-safe:transition-transform"
    >
      <div className="flex flex-col items-center text-center">
        <TrainerAvatar
          name={trainer.profile.name}
          photoUrl={profile?.profilePhotoUrl}
          rating={rating}
          isAvailable={profile?.isAvailableForNewClients}
          size={96}
        />

        <h3
          className="mt-4 text-base font-extrabold tracking-tight text-foreground"
          style={{ letterSpacing: "-0.02em" }}
        >
          {trainer.profile.name}
        </h3>

        {primarySpecialty && (
          <span className="mt-1 font-mono text-xs uppercase tracking-wide text-muted-foreground">
            {primarySpecialty}
          </span>
        )}

        <div className="mt-3 font-mono text-xs text-muted-foreground">
          {rating > 0 ? (
            <span className="inline-flex items-center gap-1">
              <span className="text-foreground">{rating.toFixed(1)}</span>
              <span className="text-primary">★</span>
              <span>· {reviewCount}</span>
            </span>
          ) : (
            <span>—</span>
          )}
        </div>

        <div className="mt-1 font-mono text-xs text-muted-foreground">
          {profile?.hourlyRate ? (
            <span>
              {t("currency_symbol")}
              {profile.hourlyRate}
              {tTrainers("per_hour")}
            </span>
          ) : null}
          {profile?.hourlyRate && profile?.yearsOfExperience ? (
            <span className="mx-1">·</span>
          ) : null}
          {profile?.yearsOfExperience ? (
            <span>
              {profile.yearsOfExperience}
              {tTrainers("years_exp")}
            </span>
          ) : null}
        </div>

        {profile?.isAvailableForNewClients ? (
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {tCommon("status.available")}
          </span>
        ) : (
          <span className="mt-3 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
            {tCommon("status.unavailable")}
          </span>
        )}
      </div>
    </Link>
  );
}

export default TrainerCatalogCard;
