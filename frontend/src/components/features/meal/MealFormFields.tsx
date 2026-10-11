"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { FieldLabel, fieldErrorId } from "@/components/ui/field";
import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { FieldInfo } from "@/components/ui/form-field";

interface MealFormFieldsProps {
  form: any;
  t: any;
  mealTypeItems: { value: string; label: string }[];
}

export function MealFormFields({ form, t, mealTypeItems }: MealFormFieldsProps) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
      <div className="flex flex-col space-y-2">
        <FieldLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground" htmlFor="date">{t("form.date_time_label")}</FieldLabel>
        <div className="flex flex-wrap gap-4">
          <form.Field name="date">
            {(field: any) => (
              <DatePicker
                value={field.state.value}
                onChange={(d) => { if (d) field.handleChange(d); }}
                onBlur={field.handleBlur}
                id="date"
                className="w-full md:w-45"
                required
              />
            )}
          </form.Field>
          <form.Field name="mealTime">
            {(field: any) => (
              <div className="space-y-2">
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  type="time"
                  id="mealTime"
                  data-testid="meal-time"
                  className="w-full md:w-[120px]"
                  aria-describedby={fieldErrorId(field.name)}
                />
                <FieldInfo field={field} />
              </div>
            )}
          </form.Field>
        </div>
      </div>
      <div className="flex flex-col space-y-2">
        <FieldLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{t("form.meal_type_label")}</FieldLabel>
        <form.Field name="mealType">
          {(field: any) => (
            <div className="space-y-2">
              <Select
                items={mealTypeItems}
                value={field.state.value}
                onValueChange={(e: string | null) => {
                  field.handleChange((e ?? "breakfast") as Parameters<typeof field.handleChange>[0]);
                }}
              >
                <SelectTrigger
                  className="w-full"
                  aria-describedby={fieldErrorId(field.name)}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>{t("form.meal_type_label")}</SelectLabel>
                    {mealTypeItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldInfo field={field} />
            </div>
          )}
        </form.Field>
      </div>
    </div>
  );
}
