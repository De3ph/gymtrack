"use client";

import { Equipment } from "@/types";
import { cn } from "@/lib/utils";

interface EquipmentBadgeProps {
  equipment: Equipment;
  className?: string;
  variant?: "default" | "small";
}

export function EquipmentBadge({ 
  equipment, 
  className,
  variant = "default"
}: EquipmentBadgeProps) {
  const baseClasses = "inline-flex items-center rounded-full font-medium";
  
  const variantClasses = {
    default: "px-3 py-1 text-sm bg-accent/10 text-accent dark:bg-accent/15",
    small: "px-2 py-0.5 text-xs bg-accent/10 text-accent dark:bg-accent/15"
  };

  return (
    <span className={cn(baseClasses, variantClasses[variant], className)}>
      {equipment.description}
    </span>
  );
}
