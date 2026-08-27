"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import dayjs from "dayjs";

import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/ui/field";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "@/components/ui/combobox";
import { FieldInfo } from "@/components/ui/form-field";
import { DATE_FORMATS } from "@/lib/constants";

interface EditMealHeaderProps {
  form: any;
  t: any;
}

export function EditMealHeader({ form, t }: EditMealHeaderProps) {
  return (
    <div className="flex flex-col space-y-2">
      <FieldLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground" htmlFor="date">{t("form.date_time_label")}</FieldLabel>
      <div className="flex flex-wrap gap-4">
        <form.Field name="date">
          {(field: any) => (
            <Input
              value={dayjs(field.state.value).format(DATE_FORMATS.DATE_ONLY)}
              onChange={(e) => field.handleChange(dayjs(e.target.value).toDate())}
              onBlur={field.handleBlur}
              type="date"
              id="date"
              className="w-full md:w-[180px]"
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
                className="w-full md:w-[120px]"
              />
              <FieldInfo field={field} />
            </div>
          )}
        </form.Field>
        <form.Field name="mealType">
          {(field: any) => (
            <Combobox>
              <ComboboxInput
                value={field.state.value}
                onChange={(e) => field.handleChange((e.target.value ?? "breakfast") as Parameters<typeof field.handleChange>[0])}
              />
              <ComboboxContent className="rounded-none border border-border shadow-none">
                <ComboboxList>
                  <ComboboxItem value="breakfast">{t("form.meal_type.breakfast")}</ComboboxItem>
                  <ComboboxItem value="lunch">{t("form.meal_type.lunch")}</ComboboxItem>
                  <ComboboxItem value="dinner">{t("form.meal_type.dinner")}</ComboboxItem>
                  <ComboboxItem value="snack">{t("form.meal_type.snack")}</ComboboxItem>
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          )}
        </form.Field>
      </div>
    </div>
  );
}
