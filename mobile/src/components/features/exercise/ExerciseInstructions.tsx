import React, { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";

interface ExerciseInstructionsProps {
  instructions?: string;
}

/**
 * Splits a free-text `instructions` column into displayable steps. Mirrors web
 * `ExerciseInstructions.splitSteps`: newline-separated lines first, then
 * leading "1." / "1)" numbering for a single pasted blob. Sentence splitting
 * was rejected (same as web): coaching cues often contain multiple sentences
 * per step, so it invents steps the author never wrote.
 */
export function splitSteps(instructions: string): string[] {
  const trimmed = instructions.trim();
  if (!trimmed) return [];

  const byLine = trimmed
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const numbered = trimmed.match(/(?:^|\s)\d+[.)]\s+/g);
  if (byLine.length === 1 && numbered && numbered.length > 1) {
    return trimmed
      .split(/\s*\d+[.)]\s+/)
      .map((step) => step.trim())
      .filter(Boolean);
  }

  return byLine;
}

export const ExerciseInstructions = React.memo(function ExerciseInstructions({
  instructions,
}: ExerciseInstructionsProps) {
  const { t } = useI18n();
  const steps = useMemo(
    () => (instructions ? splitSteps(instructions) : []),
    [instructions],
  );

  if (steps.length === 0) {
    return (
      <Box className="border border-border px-4 py-6">
        <Text className="text-center text-[10px] uppercase tracking-[1.8px] text-text-secondary">
          {t("exercise.library.no_instructions")}
        </Text>
      </Box>
    );
  }

  // One step reads as prose; a list only earns its numbering at two or more.
  if (steps.length === 1) {
    return (
      <Text className="text-sm leading-6 text-text" selectable>
        {steps[0]}
      </Text>
    );
  }

  return (
    <Box className="gap-3">
      {steps.map((step, index) => (
        <Box key={index} className="flex-row gap-3">
          <Box className="mt-0.5 h-6 w-6 shrink-0 items-center justify-center border border-border">
            <Text className="text-[10px] tracking-[1.8px] text-text-secondary">
              {index + 1}
            </Text>
          </Box>
          <Text className="flex-1 text-sm leading-6 text-text" selectable>
            {step}
          </Text>
        </Box>
      ))}
    </Box>
  );
});
