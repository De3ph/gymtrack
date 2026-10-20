"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft, ListOrdered, Video } from "lucide-react";
import type { ExerciseLibrary, UserRole } from "@/types";
import { ROUTES } from "@/lib/routes";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MuscleGroupBadge } from "@/components/features/exercise/MuscleGroupBadge";
import { EquipmentBadge } from "@/components/features/exercise/EquipmentBadge";
import { ExerciseMediaPanel } from "@/components/features/exercise/ExerciseMediaPanel";
import {
  ExerciseInstructions,
  ExerciseSectionHeader,
} from "@/components/features/exercise/ExerciseInstructions";
import { AddExerciseToPlanButton } from "@/components/features/workout-plan/AddExerciseToPlanButton";

interface ExerciseDetailClientProps {
  exercise: ExerciseLibrary;
  /** Role of the signed-in user, used to gate the "add to plan" action. */
  role: UserRole;
}

export function ExerciseDetailClient({ exercise, role }: ExerciseDetailClientProps) {
  const t = useTranslations("exercise.library");
  const tCommon = useTranslations("common.actions");

  return (
    <div className="container mx-auto py-6">
      {/* Back is navigation, so it stays a real <a>: middle-click, open in new
          tab, and "copy link address" all work, which a router.push button
          would break. `buttonVariants` supplies the button styling without
          wrapping the anchor in Base UI's Button, whose nativeButton prop
          defaults to true and warns when the rendered element is not a
          <button>. */}
      <Link
        href={ROUTES.EXERCISES}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "w-fit rounded-none font-mono text-[10px] uppercase tracking-[0.18em]",
        )}
      >
        <ArrowLeft className="size-5" aria-hidden="true" />
        {tCommon("back")}
      </Link>

      {/* The title sits above the two columns rather than inside the left one.
          Previously it lived in a card under the image, which put the page's
          subject below the fold of its own hero and left the left column short.
          Badges stay grouped with the title instead of being pushed to the far
          edge, where a wide viewport left them visually detached from the
          exercise they describe. */}
      <header className="mt-6 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
              {exercise.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {exercise.category}
              </p>
              {exercise.muscleGroup && (
                <MuscleGroupBadge muscleGroup={exercise.muscleGroup} />
              )}
              {exercise.equipment && (
                <EquipmentBadge equipment={exercise.equipment} />
              )}
            </div>
          </div>
          <AddExerciseToPlanButton exercise={exercise} role={role} />
        </div>
      </header>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* The demonstration is the page's hero, so it is a labelled section in
            its own right. It previously rendered as an unlabelled image with a
            separate "Demonstration — a demonstration is available above" block
            in the other column, which described the image instead of showing it. */}
        <section className="space-y-4">
          <ExerciseSectionHeader icon={Video}>
            {t("media_title")}
          </ExerciseSectionHeader>
          <ExerciseMediaPanel exercise={exercise} size="detail" />
        </section>

        <div className="space-y-6">
          <section className="space-y-4">
            <ExerciseSectionHeader icon={ListOrdered}>
              {t("instructions_title")}
            </ExerciseSectionHeader>
            <ExerciseInstructions instructions={exercise.instructions} />
          </section>
        </div>
      </div>
    </div>
  );
}
