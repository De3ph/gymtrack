"use client";

import { Equipment } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useExerciseLookupLabels } from "./exercise-labels";

interface EquipmentBadgeProps {
  equipment: Equipment;
  className?: string;
  variant?: "default" | "small";
}

export function EquipmentBadge({
  equipment,
  className,
  variant = "default",
}: EquipmentBadgeProps) {
  // Resolved from `code` rather than the English-only description, and never
  // blank even though description is optional in the generated type.
  const { equipmentLabel } = useExerciseLookupLabels();
  const label = equipmentLabel(equipment);

  return (
    <Badge
      variant="outline"
      className={cn(
        "h-auto rounded-none border-border bg-transparent px-2 py-1 font-mono text-balance uppercase tracking-[0.18em] text-muted-foreground",
        variant === "small" && "px-1.5 py-0.5 text-[9px]",
        className,
      )}
    >
      {label}
    </Badge>
  );
}
