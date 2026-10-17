"use client";

import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "@/components/ui/combobox";
import { useTranslations } from "next-intl"

interface MealType {
  value: string
}

const mealTypes: MealType[] = [
  { value: "" },
  { value: "breakfast" },
  { value: "lunch" },
  { value: "dinner" },
  { value: "snack" }
]

interface OverviewTabProps {
  dateRange: { start: string; end: string };
  exerciseType: string;
  mealType: string;
  onDateRangeChange: (range: { start: string; end: string }) => void;
  onExerciseTypeChange: (type: string) => void;
  onMealTypeChange: (type: string) => void;
  onClearFilters: () => void;
}

export function OverviewTab({
  dateRange,
  exerciseType,
  mealType,
  onDateRangeChange,
  onExerciseTypeChange,
  onMealTypeChange,
  onClearFilters,
}: OverviewTabProps) {
  const t = useTranslations("trainer.client_detail.overview")
  const tCommon = useTranslations("common.actions")

  return (
    <div className="rounded-none border border-border mb-6">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("filter_data")}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t("filter_description")}</p>
      </div>
      <div className="p-6">
        <div className='flex flex-wrap gap-4'>
          <div>
            <label className='text-sm font-[500]'>{t("start_date")}</label>
            <input
              type='date'
              value={dateRange.start}
              onChange={(e) =>
                onDateRangeChange({ ...dateRange, start: e.target.value })
              }
              className='mt-1 block rounded-none border border-border bg-background px-3 py-2 text-sm'
            />
          </div>
          <div>
            <label className='text-sm font-[500]'>{t("end_date")}</label>
            <input
              type='date'
              value={dateRange.end}
              onChange={(e) =>
                onDateRangeChange({ ...dateRange, end: e.target.value })
              }
              className='mt-1 block rounded-none border border-border bg-background px-3 py-2 text-sm'
            />
          </div>
          <div>
            <label className='text-sm font-[500]'>{t("exercise_type")}</label>
            <input
              type='text'
              placeholder={t("exercise_placeholder")}
              value={exerciseType}
              onChange={(e) => onExerciseTypeChange(e.target.value)}
              className='mt-1 block rounded-none border border-border bg-background px-3 py-2 text-sm'
            />
          </div>
          <div>
            <label className='text-sm font-[500]'>{t("meal_type")}</label>
            <Combobox>
              <ComboboxInput
                placeholder={t("meal_placeholder")}
                value={mealType}
                onChange={(e) => onMealTypeChange(e.target.value)}
              />
              <ComboboxContent>
                <ComboboxList>
                  {mealTypes.map((type) => (
                    <ComboboxItem key={type.value} value={type}>
                      {t(`meal_types.${type.value || "all"}`)}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
          <div className='flex items-end gap-2'>
            <Button className="rounded-none">{tCommon("apply_filters")}</Button>
            <Button variant='outline' onClick={onClearFilters} className="rounded-none">
              {tCommon("clear")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
