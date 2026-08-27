"use client";

import { MuscleGroup } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-auto rounded-none border-border bg-transparent px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground",
        variant === "small" && "px-1.5 py-0.5 text-[9px]",
        className,
      )}
    >
      {muscleGroup.description}
    </Badge>
  );
}
