"use client";

import { MuscleGroup } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useExerciseLookupLabels } from "./exercise-labels";

interface MuscleGroupBadgeProps {
  muscleGroup: MuscleGroup;
  className?: string;
  variant?: "default" | "small";
}

export function MuscleGroupBadge({
  muscleGroup,
  className,
  variant = "default",
}: MuscleGroupBadgeProps) {
  // The stored description is English-only, so the label is resolved from the
  // code instead. It also guarantees a non-empty label: description is optional
  // in the generated type because swagger 2.x emits no `required` list.
  const { muscleGroupLabel } = useExerciseLookupLabels();
  const label = muscleGroupLabel(muscleGroup);

  return (
    <Badge
      variant="outline"
      className={cn(
        "h-auto rounded-none border-border bg-transparent px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground",
        variant === "small" && "px-1.5 py-0.5 text-[9px]",
        className,
      )}
    >
      {label}
    </Badge>
  );
}
