"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldInfo } from "@/components/ui/form-field";

interface FoodItemCardProps {
  form: any;
  index: number;
  onRemove: () => void;
  canRemove: boolean;
  t: any;
  testIdPrefix?: string;
}

export function FoodItemCard({ form, index, onRemove, canRemove, t, testIdPrefix = "meal" }: FoodItemCardProps) {
  return (
    <Card className="relative rounded-none border border-border shadow-none ring-0 overflow-visible">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute right-2 top-2 text-muted-foreground hover:text-destructive rounded-none"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label="Remove item"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </Button>
      <CardHeader className="pb-2 px-6 pt-6 rounded-none">
        <CardTitle className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-normal">
          {t("form.food_item_title", { index: index + 1 })}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 px-6 pb-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2 col-span-2">
          <FieldLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{t("form.food_name_label")}</FieldLabel>
          <form.Field name={`items[${index}].food`}>
            {(subField: any) => (
              <Field>
                <Input
                  value={subField.state.value}
                  onChange={(e) => subField.handleChange(e.target.value)}
                  onBlur={subField.handleBlur}
                  placeholder={t("form.food.placeholder")}
                  data-testid={`${testIdPrefix}-food`}
                />
                <FieldInfo field={subField} />
              </Field>
            )}
          </form.Field>
        </div>

        <div className="space-y-2">
          <FieldLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{t("form.quantity.label")}</FieldLabel>
          <form.Field name={`items[${index}].quantity`}>
            {(subField: any) => (
              <Field>
                <Input
                  value={subField.state.value}
                  onChange={(e) => subField.handleChange(e.target.value)}
                  onBlur={subField.handleBlur}
                  placeholder={t("form.quantity.placeholder")}
                  data-testid={`${testIdPrefix}-quantity`}
                />
                <FieldInfo field={subField} />
              </Field>
            )}
          </form.Field>
        </div>

        <div className="space-y-2">
          <FieldLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{t("form.calories.label")}</FieldLabel>
          <form.Field name={`items[${index}].calories`}>
            {(subField: any) => (
              <Field>
                <Input
                  value={subField.state.value}
                  onChange={(e) => subField.handleChange(Number(e.target.value))}
                  onBlur={subField.handleBlur}
                  type="number"
                  placeholder={t("form.calories.placeholder")}
                  data-testid={`${testIdPrefix}-calories`}
                />
                <FieldInfo field={subField} />
              </Field>
            )}
          </form.Field>
        </div>

        <div className="space-y-2 col-span-full">
          <FieldLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{t("form.macros.label")}</FieldLabel>
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
