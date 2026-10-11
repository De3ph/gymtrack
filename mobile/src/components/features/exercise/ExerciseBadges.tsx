import React from "react";
import type { Equipment, MuscleGroup } from "@/types";
import { Badge, BadgeText } from "@/components/ui/badge";
import { useExerciseLookupLabels } from "./exercise-labels";

interface ExerciseBadgeProps {
  muscleGroup?: MuscleGroup;
  equipment?: Equipment;
}

/**
 * Outline badges for muscle-group / equipment labels. Mirrors web
 * `MuscleGroupBadge` + `EquipmentBadge`: labels resolve from the stored `code`
 * (English-only `description` is the fallback), never blank even though the
 * generated types mark every field optional.
 */
export const MuscleGroupBadge = React.memo(function MuscleGroupBadge({
  muscleGroup,
}: {
  muscleGroup: MuscleGroup;
}) {
  const { muscleGroupLabel } = useExerciseLookupLabels();
  return (
    <Badge variant="outline" className="rounded-md bg-transparent">
      <BadgeText className="text-[9px] uppercase tracking-[1.8px] text-text-secondary">
        {muscleGroupLabel(muscleGroup)}
      </BadgeText>
    </Badge>
  );
});

export const EquipmentBadge = React.memo(function EquipmentBadge({
  equipment,
}: {
  equipment: Equipment;
}) {
  const { equipmentLabel } = useExerciseLookupLabels();
  return (
    <Badge variant="outline" className="rounded-md bg-transparent">
      <BadgeText className="text-[9px] uppercase tracking-[1.8px] text-text-secondary">
        {equipmentLabel(equipment)}
      </BadgeText>
    </Badge>
  );
});

export const ExerciseBadges = React.memo(function ExerciseBadges({
  muscleGroup,
  equipment,
}: ExerciseBadgeProps) {
  if (!muscleGroup && !equipment) return null;
  return (
    <>
      {muscleGroup ? <MuscleGroupBadge muscleGroup={muscleGroup} /> : null}
      {equipment ? <EquipmentBadge equipment={equipment} /> : null}
    </>
  );
});
