"use client";

import { ArrowUpRight } from "lucide-react";
import type { ExerciseLibrary } from "@/types";
import { DYNAMIC_ROUTES } from "@/lib/routes";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { MuscleGroupBadge } from "./MuscleGroupBadge";
import { EquipmentBadge } from "./EquipmentBadge";
import { ExerciseMediaPanel } from "./ExerciseMediaPanel";

interface ExerciseLibraryCardProps {
  exercise: ExerciseLibrary;
  className?: string;
}

/**
 * Grid card for the exercise library.
 *
 * The whole tile is a single link rather than a card with a "view details"
 * button: the tile is the hit target, so there is no nested-interactive
 * problem and no dead margin to click. Badges inside are plain spans, so the
 * link stays the only tab stop and screen readers announce it as one control.
 */
export function ExerciseLibraryCard({
  exercise,
  className,
}: ExerciseLibraryCardProps) {
  return (
    <Link
      href={DYNAMIC_ROUTES.EXERCISE_DETAIL(exercise.exerciseId)}
      className={cn(
        "group flex h-full flex-col border border-border bg-background transition-[border-color,transform] duration-150 ease-out hover:border-foreground/40 motion-safe:hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <div className="relative border-b border-border">
        <ExerciseMediaPanel exercise={exercise} size="card" />
        {exercise.mediaUrl && (
          <span className="pointer-events-none absolute right-2 top-2 flex size-7 items-center justify-center border border-border bg-background/90 text-muted-foreground transition-colors duration-150 ease-out group-hover:text-foreground">
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 px-4 py-4">
        <h3 className="text-lg font-semibold leading-tight text-foreground">
          {exercise.name}
        </h3>

        {(exercise.muscleGroup || exercise.equipment) && (
          <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
            {exercise.muscleGroup && (
              <MuscleGroupBadge muscleGroup={exercise.muscleGroup} variant="small" />
            )}
            {exercise.equipment && (
              <EquipmentBadge equipment={exercise.equipment} variant="small" />
            )}
          </div>
        )}
      </div>
    </Link>
  );
}