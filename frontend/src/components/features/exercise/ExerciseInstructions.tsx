"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExerciseInstructionsProps {
  instructions?: string;
  className?: string;
}

/**
 * Splits a free-text `instructions` column into displayable steps.
 *
 * The backend stores instructions as one opaque string with no step structure,
 * so the boundaries have to be inferred. Two shapes are recognised, in order of
 * how reliably they mean "a new step":
 *
 *   1. newline-separated lines      — the common hand-written form
 *   2. leading "1." / "1)" numbering — a single blob someone pasted as steps
 *
 * Splitting on sentence boundaries was rejected: coaching cues often contain
 * multiple sentences per step ("Bend the knees. Keep the back flat."), so
 * sentence splitting invents steps the author never wrote.
 */
function splitSteps(instructions: string): string[] {
  const trimmed = instructions.trim();
  if (!trimmed) return [];

  const byLine = trimmed
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  // A single line that still enumerates its steps: "1. Lie down 2. Press up".
  const numbered = trimmed.match(/(?:^|\s)\d+[.)]\s+/g);
  if (byLine.length === 1 && numbered && numbered.length > 1) {
    return trimmed
      .split(/\s*\d+[.)]\s+/)
      .map((step) => step.trim())
      .filter(Boolean);
  }

  return byLine;
}

export function ExerciseInstructions({
  instructions,
  className,
}: ExerciseInstructionsProps) {
  const t = useTranslations("exercise.library");
  const steps = useMemo(
    () => (instructions ? splitSteps(instructions) : []),
    [instructions],
  );

  if (steps.length === 0) {
    return (
      <p
        className={cn(
          "border border-border px-4 py-6 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground",
          className,
        )}
      >
        {t("no_instructions")}
      </p>
    );
  }

  // One step reads as prose; a list only earns its numbering at two or more.
  if (steps.length === 1) {
    return (
      <p className={cn("text-sm leading-6 text-foreground", className)}>
        {steps[0]}
      </p>
    );
  }

  return (
    <ol className={cn("space-y-3", className)}>
      {steps.map((step, index) => (
        <li key={index} className="flex gap-3">
          <span
            className="mt-0.5 flex size-6 shrink-0 items-center justify-center border border-border font-mono text-[10px] tracking-[0.18em] text-muted-foreground"
            aria-hidden="true"
          >
            {index + 1}
          </span>
          <span className="text-sm leading-6 text-foreground">{step}</span>
        </li>
      ))}
    </ol>
  );
}

/** Section header shared by the detail page blocks. */
export function ExerciseSectionHeader({
  icon: Icon = ListOrdered,
  children,
}: {
  icon?: typeof ListOrdered;
  children: React.ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2 border-b border-border pb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
      <Icon className="size-5 text-foreground" aria-hidden="true" />
      {children}
    </h2>
  );
}