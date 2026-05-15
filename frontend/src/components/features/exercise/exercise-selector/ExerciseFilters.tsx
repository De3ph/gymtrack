import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { MuscleGroup, Equipment } from "@/types"

interface ExerciseFiltersProps {
  selectedMuscleGroup?: number
  selectedEquipment?: number
  searchQuery: string
  muscleGroups: MuscleGroup[]
  equipment: Equipment[]
  onMuscleGroupChange: (value: number | undefined) => void
  onEquipmentChange: (value: number | undefined) => void
  onClearFilters: () => void
}

export function ExerciseFilters({
  selectedMuscleGroup,
  selectedEquipment,
  searchQuery,
  muscleGroups,
  equipment,
  onMuscleGroupChange,
  onEquipmentChange,
  onClearFilters
}: ExerciseFiltersProps) {
  const t = useTranslations("exercise")
  const hasActiveFilters =
    selectedMuscleGroup || selectedEquipment || searchQuery

  return (
    <div className='flex flex-wrap gap-2'>
      {/* Muscle Group Filter */}
      <select
        value={selectedMuscleGroup || ""}
        onChange={(e) =>
          onMuscleGroupChange(
            e.target.value ? Number(e.target.value) : undefined
          )
        }
        className='px-3 py-1 text-sm border rounded-md bg-background'
      >
        <option value=''>{t("filters.all_muscle_groups")}</option>
        {muscleGroups.map((mg: MuscleGroup) => (
          <option key={mg.id} value={mg.id}>
            {mg.description}
          </option>
        ))}
      </select>

      {/* Equipment Filter */}
      <select
        value={selectedEquipment || ""}
        onChange={(e) =>
          onEquipmentChange(e.target.value ? Number(e.target.value) : undefined)
        }
        className='px-3 py-1 text-sm border rounded-md bg-background'
      >
        <option value=''>{t("filters.all_equipment")}</option>
        {equipment.map((eq: Equipment) => (
          <option key={eq.id} value={eq.id}>
            {eq.description}
          </option>
        ))}
      </select>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant='ghost'
          size='sm'
          onClick={onClearFilters}
          className='text-xs'
        >
          <X className='w-3 h-3 mr-1' />
          {t("filters.clear")}
        </Button>
      )}
    </div>
  )
}
