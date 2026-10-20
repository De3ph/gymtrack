"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { GripVertical, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, fieldErrorId } from "@/components/ui/field";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldInfo } from "@/components/ui/form-field";
import { SortableItemHandle } from "@/components/ui/sortable";

interface FoodItemCardProps {
  form: any;
  index: number;
  onRemove: () => void;
  canRemove: boolean;
  t: any;
  testIdPrefix?: string;
  /**
   * Ref callback for the card's root element. The form uses these to scroll to
   * (and focus) a newly added food item.
   */
  containerRef?: (node: HTMLElement | null) => void;
}

export function FoodItemCard({ form, index, onRemove, canRemove, t, testIdPrefix = "meal", containerRef }: FoodItemCardProps) {
  return (
    <Card
      ref={containerRef}
      className="relative gap-0 overflow-visible rounded-none border border-border py-0 shadow-none ring-0"
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border px-4 py-2 sm:px-6">
        <div className="flex items-center gap-2">
          <SortableItemHandle
            aria-label={t("form.reorder")}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="size-5" aria-hidden="true" />
          </SortableItemHandle>
          <CardTitle className="font-mono text-[10px] font-normal uppercase tracking-[0.18em] text-muted-foreground">
            {t("form.item", { number: index + 1 })}
          </CardTitle>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="h-8 w-8 shrink-0 rounded-none text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label="Remove item"
        >
          <Trash2 className="size-5" aria-hidden="true" />
        </Button>
      </CardHeader>
      <CardContent className="grid gap-8 px-6 py-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2 col-span-4">
          <FieldLabel htmlFor={`${testIdPrefix}-food`} className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{t("form.food_name_label")}</FieldLabel>
          <form.Field name={`items[${index}].food`}>
            {(subField: any) => (
              <Field>
                <Input
                  id={`${testIdPrefix}-food`}
                  value={subField.state.value}
                  onChange={(e) => subField.handleChange(e.target.value)}
                  onBlur={subField.handleBlur}
                  placeholder={t("form.food.placeholder")}
                  data-testid={`${testIdPrefix}-food`}
                  aria-describedby={fieldErrorId(subField.name)}
                />
                <FieldInfo field={subField} />
              </Field>
            )}
          </form.Field>
        </div>

        <div className="space-y-2 col-span-2">
          <FieldLabel htmlFor={`${testIdPrefix}-quantity`} className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{t("form.quantity.label")}</FieldLabel>
          <form.Field name={`items[${index}].quantity`}>
            {(subField: any) => (
              <Field>
                <Input
                  id={`${testIdPrefix}-quantity`}
                  value={subField.state.value}
                  onChange={(e) => subField.handleChange(e.target.value)}
                  onBlur={subField.handleBlur}
                  placeholder={t("form.quantity.placeholder")}
                  data-testid={`${testIdPrefix}-quantity`}
                  aria-describedby={fieldErrorId(subField.name)}
                />
                <FieldInfo field={subField} />
              </Field>
            )}
          </form.Field>
        </div>

        <div className="space-y-2 col-span-2">
          <FieldLabel htmlFor={`${testIdPrefix}-calories`} className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{t("form.calories.label")}</FieldLabel>
          <form.Field name={`items[${index}].calories`}>
            {(subField: any) => (
              <Field>
                <Input
                  id={`${testIdPrefix}-calories`}
                  value={subField.state.value}
                  onChange={(e) => subField.handleChange(Number(e.target.value))}
                  onBlur={subField.handleBlur}
                  type="number"
                  placeholder={t("form.calories.placeholder")}
                  data-testid={`${testIdPrefix}-calories`}
                  aria-describedby={fieldErrorId(subField.name)}
                />
                <FieldInfo field={subField} />
              </Field>
            )}
          </form.Field>
        </div>

        <div className="space-y-2 col-span-full">
          <FieldLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-4">{t("form.macros.label")}</FieldLabel>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <FieldLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {t("form.macros.protein")}
              </FieldLabel>
              <form.Field name={`items[${index}].macros.protein`}>
                {(subField: any) => (
                  <Input
                    value={subField.state.value}
                    onChange={(e) => subField.handleChange(Number(e.target.value))}
                    onBlur={subField.handleBlur}
                    type="number"
                    data-testid={`${testIdPrefix}-protein`}
                  />
                )}
              </form.Field>
            </div>
            <div>
              <FieldLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {t("form.macros.carbs")}
              </FieldLabel>
              <form.Field name={`items[${index}].macros.carbs`}>
                {(subField: any) => (
                  <Input
                    value={subField.state.value}
                    onChange={(e) => subField.handleChange(Number(e.target.value))}
                    onBlur={subField.handleBlur}
                    type="number"
                    data-testid={`${testIdPrefix}-carbs`}
                  />
                )}
              </form.Field>
            </div>
            <div>
              <FieldLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {t("form.macros.fats")}
              </FieldLabel>
              <form.Field name={`items[${index}].macros.fats`}>
                {(subField: any) => (
                  <Input
                    value={subField.state.value}
                    onChange={(e) => subField.handleChange(Number(e.target.value))}
                    onBlur={subField.handleBlur}
                    type="number"
                    data-testid={`${testIdPrefix}-fats`}
                  />
                )}
              </form.Field>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
