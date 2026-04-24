"use client";

import { MuscleGroup } from "@/types";
import { cn } from "@/lib/utils";

interface MuscleGroupBadgeProps {
  muscleGroup: MuscleGroup;
  className?: string;
  variant?: "default" | "small";
}

export function MuscleGroupBadge({ 
  muscleGroup, 
  className,
  variant = "default"
}: MuscleGroupBadgeProps) {
  const baseClasses = "inline-flex items-center rounded-full font-medium";
  
  const variantClasses = {
    default: "px-3 py-1 text-sm bg-purple-100 text-purple-800",
    small: "px-2 py-0.5 text-xs bg-purple-100 text-purple-800"
  };

  return (
    <span className={cn(baseClasses, variantClasses[variant], className)}>
      {muscleGroup.description}
    </span>
  );
}
