"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "@/components/ui/combobox";

interface MealType {
  label: string;
  value: string;
}

const mealTypes: MealType[] = [
  { label: "All", value: "" },
  { label: "Breakfast", value: "breakfast" },
  { label: "Lunch", value: "lunch" },
  { label: "Dinner", value: "dinner" },
  { label: "Snack", value: "snack" },
];

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
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Filter Data</CardTitle>
        <CardDescription>Filter workouts and meals by date range and type</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="text-sm font-medium">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
              className="mt-1 block rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
              className="mt-1 block rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Exercise Type</label>
            <input
              type="text"
              placeholder="e.g., Bench Press"
              value={exerciseType}
              onChange={(e) => onExerciseTypeChange(e.target.value)}
              className="mt-1 block rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Meal Type</label>
            <Combobox>
              <ComboboxInput
                placeholder="All meal types"
                value={mealType}
                onChange={(e) => onMealTypeChange(e.target.value)}
              />
              <ComboboxContent>
                <ComboboxList>
                  {mealTypes.map((type) => (
                    <ComboboxItem key={type.value} value={type}>
                      {type.label}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
          <div className="flex items-end gap-2">
            <Button>Apply Filters</Button>
            <Button variant="outline" onClick={onClearFilters}>
              Clear
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
