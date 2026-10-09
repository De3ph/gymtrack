"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dumbbell } from "lucide-react";
import type { ExerciseLibrary, ExerciseMediaType } from "@/types";
import { cn } from "@/lib/utils";

interface ExerciseMediaPanelProps {
  exercise: ExerciseLibrary;
  className?: string;
  /** Small tile for a grid card; full-bleed frame for the detail page. */
  size?: "card" | "detail";
}

/**
 * Renders an exercise's demonstration asset.
 *
 * The catalog stores a URL plus a renderer hint rather than a baked-in format,
 * because GIF, MP4, and still image all need different elements and only the
 * catalog knows which one a given row holds. Three states are handled:
 *
 *   - a renderable asset (gif/image → <img>, video → <video>)
 *   - no asset at all (mediaUrl empty) → a labelled placeholder
 *   - an asset that fails to load → the same placeholder
 *
 * The failure path matters more than it looks: media URLs point at third-party
 * CDNs, and a dead link must degrade to a placeholder rather than a broken-image
 * icon inside an otherwise finished page.
 */
export function ExerciseMediaPanel({
  exercise,
  className,
  size = "detail",
}: ExerciseMediaPanelProps) {
  const t = useTranslations("exercise.library");
  const [hasError, setHasError] = useState(false);

  const mediaType: ExerciseMediaType = exercise.mediaType ?? "gif";
  const hasMedia = Boolean(exercise.mediaUrl) && !hasError;
  const isDetail = size === "detail";

  if (!hasMedia) {
    return (
      <div
        className={cn(
          "flex items-center justify-center border border-border bg-muted/40",
          isDetail ? "aspect-video w-full" : "aspect-[4/3] w-full",
          className,
        )}
        data-testid="exercise-media-placeholder"
      >
        <div className="flex flex-col items-center gap-2 px-4 text-center">
          <Dumbbell
            className={cn(
              "text-muted-foreground/40",
              isDetail ? "size-10" : "size-7",
            )}
            aria-hidden="true"
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
            {t("no_media")}
          </span>
        </div>
      </div>
    );
  }

  if (mediaType === "video") {
    return (
      <div
        className={cn(
          "overflow-hidden border border-border bg-black",
          isDetail ? "aspect-video w-full" : "aspect-[4/3] w-full",
          className,
        )}
      >
        <video
          src={exercise.mediaUrl}
          className="size-full object-cover"
          // Muted + looping but never autoplaying: a demo that starts moving on
          // scroll is exactly the kind of unrequested motion that ignores
          // prefers-reduced-motion. The controls make playback deliberate.
          muted
          loop
          playsInline
          controls
          preload="metadata"
          aria-label={t("media_label", { name: exercise.name })}
          onError={() => setHasError(true)}
        />
      </div>
    );
  }

  // GIF and still image share a renderer. `next/image` would add an optimizer
  // hop to an already third-party-hosted asset, so the raw element is used with
  // explicit dimensions and lazy loading — the same trade the welcome GIF
  // dialog makes.
  return (
    <div
      className={cn(
        "overflow-hidden border border-border bg-muted",
        isDetail ? "aspect-video w-full" : "aspect-[4/3] w-full",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={exercise.mediaUrl}
        alt={t("media_label", { name: exercise.name })}
        loading={isDetail ? "eager" : "lazy"}
        decoding="async"
        className="size-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}