"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, MapPin, Star } from "lucide-react";
import dayjs from "dayjs";
import { trainerCatalogApi, availabilityApi, reviewApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import {
  TrainerWithProfile,
  TrainerAvailability,
  TrainerReview,
} from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CreateReviewDialog } from "@/components/features/reviews/CreateReviewDialog";
import { ReviewActions } from "@/components/features/reviews/ReviewActions";
import { CoachingRequestDialog } from "@/components/features/coaching/CoachingRequestDialog";
import {
  trainerStagger,
  trainerReveal,
} from "@/components/features/trainer/trainer-detail-variants";
import { DAYS_OF_WEEK } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const heroContainer = trainerStagger;
const heroItem = trainerReveal;
const sectionContainer = trainerStagger;
const sectionItem = trainerReveal;

function getInitials(name?: string): string {
  if (!name?.trim()) return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Stars({ value }: { value: number }) {
  const full = Math.floor(value);
  return (
    <span className="inline-flex items-center" aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "size-5",
            i < full ? "fill-current text-amber-400" : "text-muted-foreground/30",
          )}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

const stripColon = (s: string) => s.replace(/:\s*$/, "");

export default function TrainerProfilePage() {
  const t = useTranslations("athlete.trainers.detail");
  const tTrainers = useTranslations("athlete.trainers");
  const tCatalog = useTranslations("trainer.catalog");
  const tCommon = useTranslations("common");
  const params = useParams();
  const trainerId = params.id as string;

  const [trainer, setTrainer] = useState<TrainerWithProfile | null>(null);
  const [availability, setAvailability] = useState<TrainerAvailability[]>([]);
  const [reviews, setReviews] = useState<TrainerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const currentUserId = user?.userId ? String(user.userId) : "";

  const refreshData = useCallback(async () => {
    try {
      const [trainerData, availabilityData, reviewsData] = await Promise.all([
        trainerCatalogApi.getTrainerProfile(trainerId),
        availabilityApi.getTrainerAvailability(trainerId),
        reviewApi.getTrainerReviews(trainerId),
      ]);
      setTrainer(trainerData);
      setAvailability(availabilityData.slots ?? []);
      setReviews(reviewsData.reviews ?? []);
    } catch (error) {
      console.error("Failed to fetch trainer data:", error);
    }
  }, [trainerId]);

  useEffect(() => {
    let active = true;
    const start = async () => {
      await refreshData();
      if (active) setLoading(false);
    };
    void start();
    return () => {
      active = false;
    };
  }, [refreshData]);

  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-6">
        <Spinner className="size-6" />
      </main>
    );
  }

  if (!trainer) {
    return (
      <main className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="font-mono text-7xl font-medium leading-[1.05] tracking-[-0.04em] text-primary/20">
          404
        </p>
        <p className="max-w-sm text-muted-foreground">{t("not_found")}</p>
        <Link
          href="/athlete/trainers"
          className={cn(
            "inline-flex items-center gap-2 rounded-none border border-border px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] transition-colors hover:bg-muted",
          )}
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
          {tTrainers("title")}
        </Link>
      </main>
    );
  }

  const name = trainer.profile.name || trainer.email || "Trainer";
  const initials = getInitials(trainer.profile.name || trainer.email);
  const rating = trainer.averageRating || 0;
  const reviewCount = trainer.reviewCount || 0;
  const isAvailable = trainer.trainerProfile?.isAvailableForNewClients;
  const hourlyRate = trainer.trainerProfile?.hourlyRate;
  const yearsExp = trainer.trainerProfile?.yearsOfExperience;
  const location = trainer.trainerProfile?.location;
  const languages = trainer.trainerProfile?.languages;

  const statTiles = [
    {
      label: stripColon(t("hourly_rate")),
      value: hourlyRate ? `${tCatalog("currency_symbol")}${hourlyRate}` : null,
      suffix: hourlyRate ? tTrainers("per_hour") : null,
    },
    {
      label: stripColon(t("years_of_experience")),
      value: yearsExp != null ? String(yearsExp) : null,
      suffix: yearsExp != null ? tTrainers("years_exp") : null,
    },
    {
      label: stripColon(t("location")),
      value: location || null,
      suffix: null,
    },
  ];

  const defRows = [
    { label: t("specializations"), value: trainer.profile.specializations },
    { label: t("certifications"), value: trainer.profile.certifications },
    {
      label: t("languages"),
      value: languages?.length ? languages.join(", ") : null,
    },
  ];

  return (
    <main className="relative min-h-screen">
      <div className="relative mx-auto max-w-6xl px-5 pt-6">
        <Link
          href="/athlete/trainers"
          className="group inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-5 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
          {tTrainers("eyebrow")}
        </Link>
      </div>

      {/* ── HERO ────────────────────────────────────────── */}
      <section className="relative mx-auto mt-5 max-w-6xl px-5">
        <motion.div
          variants={heroContainer}
          initial="hidden"
          animate="visible"
          className="relative overflow-hidden rounded-none border border-border bg-card"
        >
          <div className="relative grid items-center gap-8 px-6 py-10 sm:grid-cols-[1fr_auto] sm:px-12 sm:py-14">
            <div>
              <motion.p
                variants={heroItem}
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
              >
                {tCommon("status.available")}
              </motion.p>

              <motion.h1
                variants={heroItem}
                className="mt-3 font-mono text-5xl font-semibold leading-[1.05] tracking-[-0.04em] text-foreground sm:text-6xl lg:text-7xl"
              >
                {name}
              </motion.h1>

              <motion.div
                variants={heroItem}
                className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"
              >
                <span className="inline-flex items-center gap-2">
                  <Stars value={rating} />
                  <span className="font-mono font-medium text-foreground">
                    {rating ? rating.toFixed(1) : "—"}
                  </span>
                  <span className="text-muted-foreground">
                    ({reviewCount} {t("reviews_count", { count: reviewCount })})
                  </span>
                </span>
                {location && (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="size-5" aria-hidden="true" />
                    {location}
                  </span>
                )}
              </motion.div>

              {isAvailable ? (
                <motion.span
                  variants={heroItem}
                  className="mt-6 inline-flex items-center gap-2 rounded-none border border-accent/40 bg-accent/10 px-3.5 py-1.5 font-mono text-xs uppercase tracking-[0.18em] text-accent-foreground"
                >
                  <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
                  {t("available")}
                </motion.span>
              ) : null}
            </div>

            {/* monogram */}
            <motion.div
              variants={heroItem}
              className="flex justify-center sm:justify-end"
            >
              <div className="relative">
                <div className="flex h-32 w-32 items-center justify-center rounded-none border border-border bg-background sm:h-36 sm:w-36">
                  <span className="font-mono text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
                    {initials}
                  </span>
                </div>
                {isAvailable ? (
                  <span className="absolute bottom-2 right-2 size-1.5 rounded-full bg-accent" aria-hidden="true" />
                ) : null}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ── CONTENT ────────────────────────────────────── */}
      <motion.div
        variants={sectionContainer}
        initial="hidden"
        animate="visible"
        className="relative mx-auto grid max-w-6xl grid-cols-1 gap-8 px-5 py-10 lg:grid-cols-3"
      >
        {/* MAIN COLUMN */}
        <div className="space-y-10 lg:col-span-2">
          {/* About */}
          {trainer.trainerProfile?.bio && (
            <motion.section variants={sectionItem}>
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {t("about")}
              </h2>
              <p className="mt-3 max-w-2xl text-lg leading-relaxed text-foreground">
                {trainer.trainerProfile.bio}
              </p>
            </motion.section>
          )}

          {/* Stat tiles */}
          <motion.section
            variants={sectionItem}
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            {statTiles.map((tile) => (
              <div
                key={tile.label}
                className="rounded-none border border-border p-5"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {tile.label}
                </p>
                <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-foreground">
                  {tile.value ?? (
                    <span className="text-base font-medium text-muted-foreground">
                      {t("not_set")}
                    </span>
                  )}
                  {tile.suffix && (
                    <span className="ml-1 text-sm font-medium text-muted-foreground">
                      {tile.suffix}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </motion.section>

          {/* Definition rows */}
          <motion.section variants={sectionItem}>
            <Card className="rounded-none border border-border shadow-none ring-0">
              <dl className="divide-y divide-border">
                {defRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-start justify-between gap-6 px-6 py-4"
                  >
                    <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {stripColon(row.label)}
                    </dt>
                    <dd className="text-right text-sm font-medium text-foreground">
                      {row.value || (
                        <span className="text-muted-foreground">
                          {t("not_set")}
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          </motion.section>

          {/* Reviews */}
          <motion.section variants={sectionItem}>
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-mono text-2xl font-semibold tracking-[-0.04em] text-foreground">
                {t("reviews_title")}
                <span className="ml-2 align-middle font-mono text-sm font-medium text-muted-foreground">
                  {reviewCount}
                </span>
              </h2>
              {currentUserId && (
                <CreateReviewDialog
                  trainerId={trainerId}
                  trainerName={name}
                  onReviewCreated={refreshData}
                >
                  <Button variant="outline" size="sm">
                    {t("write_review")}
                  </Button>
                </CreateReviewDialog>
              )}
            </div>

            {reviews.length === 0 ? (
              <p className="mt-4 rounded-none border border-border px-6 py-10 text-center text-muted-foreground">
                {t("no_reviews")}
              </p>
            ) : (
              <motion.ul
                variants={sectionContainer}
                initial="hidden"
                animate="visible"
                className="mt-5 space-y-4"
              >
                {reviews.map((review) => (
                  <motion.li
                    key={review.reviewId}
                    variants={sectionItem}
                    className="rounded-none border border-border bg-card p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Stars value={review.rating} />
                          <span className="font-mono text-xs text-muted-foreground">
                            {dayjs(review.createdAt).format("MMM D, YYYY")}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="mt-3 leading-relaxed text-foreground/90">
                            {review.comment}
                          </p>
                        )}
                      </div>
                      {currentUserId && (
                        <ReviewActions
                          review={review}
                          trainerId={trainerId}
                          currentUserId={currentUserId}
                          onReviewUpdated={refreshData}
                        />
                      )}
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </motion.section>
        </div>

        {/* SIDEBAR */}
        <aside className="lg:col-span-1">
          <div className="space-y-5 lg:sticky lg:top-6">
            <Card className="rounded-none border border-border shadow-none ring-0">
              <div className="border-b border-border px-6 py-4">
                <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {t("availability_title")}
                </h2>
              </div>
              <div className="px-6 py-5">
                {availability.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("no_availability")}
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {DAYS_OF_WEEK.map((day, index) => {
                      const daySlots = availability.filter(
                        (s) => s.dayOfWeek === index,
                      );
                      if (daySlots.length === 0) return null;
                      return (
                        <li key={day} className="flex items-start gap-3">
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                          <div className="flex-1">
                            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                              {t(`common.date.${day.toLowerCase()}`)}
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-2">
                              {daySlots.map((slot) => (
                                <span
                                  key={slot.availabilityId}
                                  className="rounded-none border border-border px-2.5 py-1 font-mono text-xs font-medium text-foreground"
                                >
                                  {formatTime(slot.startTime)} –{" "}
                                  {formatTime(slot.endTime)}
                                </span>
                              ))}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </Card>

            {currentUserId && trainer && (
              <>
                <CoachingRequestDialog
                  trainerId={trainerId}
                  trainerName={name}
                  onRequestSent={refreshData}
                >
                  <Button className="w-full">{t("request_coaching")}</Button>
                </CoachingRequestDialog>

                <CreateReviewDialog
                  trainerId={trainerId}
                  trainerName={name}
                  onReviewCreated={refreshData}
                >
                  <Button variant="outline" className="w-full">
                    {t("write_review")}
                  </Button>
                </CreateReviewDialog>
              </>
            )}
          </div>
        </aside>
      </motion.div>
    </main>
  );
}
