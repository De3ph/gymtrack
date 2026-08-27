import { useMemo } from "react";
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
import { cn } from "@/lib/utils";

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
    Boolean(selectedMuscleGroup) || Boolean(selectedEquipment) || searchQuery;

  const muscleGroupItems = useMemo(
    () => [
      { value: "", label: t("filters.all_muscle_groups") },
      ...muscleGroups.map((mg) => ({
        value: String(mg.id),
        label: mg.description,
      })),
    ],
    [muscleGroups, t],
  );

  const equipmentItems = useMemo(
    () => [
      { value: "", label: t("filters.all_equipment") },
      ...equipment.map((eq) => ({
        value: String(eq.id),
        label: eq.description,
      })),
    ],
    [equipment, t],
  );

  return (
    <div className="flex flex-wrap items-center gap-2 border border-border px-3 py-2">
      <Select
        items={muscleGroupItems}
        value={selectedMuscleGroup ? String(selectedMuscleGroup) : ""}
        onValueChange={(v: string | null) =>
          onMuscleGroupChange(v ? Number(v) : undefined)
        }
      >
        <SelectTrigger className="w-auto min-w-40 rounded-none shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-none border border-border shadow-none ring-0">
          <SelectGroup>
            <SelectLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {t("filters.all_muscle_groups")}
            </SelectLabel>
            {muscleGroupItems.map((item) => (
              <SelectItem
                key={item.value}
                value={item.value}
                className="rounded-none font-mono text-[10px] uppercase tracking-[0.18em]"
              >
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
        <SelectTrigger className="w-auto min-w-40 rounded-none shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-none border border-border shadow-none ring-0">
          <SelectGroup>
            <SelectLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {t("filters.all_equipment")}
            </SelectLabel>
            {equipmentItems.map((item) => (
              <SelectItem
                key={item.value}
                value={item.value}
                className="rounded-none font-mono text-[10px] uppercase tracking-[0.18em]"
              >
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
          className={cn(
            "rounded-none font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground",
          )}
        >
          <X className="size-4" aria-hidden="true" />
          {t("filters.clear")}
        </Button>
      )}
    </div>
  );
}
