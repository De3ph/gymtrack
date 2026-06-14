import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { MuscleGroup, Equipment } from "@/types";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ExerciseFiltersProps {
  selectedMuscleGroup?: number;
  selectedEquipment?: number;
  searchQuery: string;
  muscleGroups: MuscleGroup[];
  equipment: Equipment[];
  onMuscleGroupChange: (value: number | undefined) => void;
  onEquipmentChange: (value: number | undefined) => void;
  onClearFilters: () => void;
}

export function ExerciseFilters({
  selectedMuscleGroup,
  selectedEquipment,
  searchQuery,
  muscleGroups,
  equipment,
  onMuscleGroupChange,
  onEquipmentChange,
  onClearFilters,
}: ExerciseFiltersProps) {
  const t = useTranslations("exercise");
  const hasActiveFilters =
    selectedMuscleGroup || selectedEquipment || searchQuery;

  const muscleGroupItems = [
    { value: "", label: t("filters.all_muscle_groups") },
    ...muscleGroups.map((mg) => ({
      value: String(mg.id),
      label: mg.description,
    })),
  ];

  const equipmentItems = [
    { value: "", label: t("filters.all_equipment") },
    ...equipment.map((eq) => ({ value: String(eq.id), label: eq.description })),
  ];

  return (
    <div className="flex flex-wrap gap-2">
      <Select
        items={muscleGroupItems}
        value={selectedMuscleGroup ? String(selectedMuscleGroup) : ""}
        onValueChange={(v: string | null) =>
          onMuscleGroupChange(v ? Number(v) : undefined)
        }
      >
        <SelectTrigger className="w-auto min-w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>{t("filters.all_muscle_groups")}</SelectLabel>
            {muscleGroupItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select
        items={equipmentItems}
        value={selectedEquipment ? String(selectedEquipment) : ""}
        onValueChange={(v: string | null) =>
          onEquipmentChange(v ? Number(v) : undefined)
        }
      >
        <SelectTrigger className="w-auto min-w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>{t("filters.all_equipment")}</SelectLabel>
            {equipmentItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-xs"
        >
          <X className="w-3 h-3 mr-1" />
          {t("filters.clear")}
        </Button>
      )}
    </div>
  );
}
