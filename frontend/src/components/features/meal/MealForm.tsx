"use client";

import * as React from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2 } from "lucide-react";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldInfo } from "@/components/ui/form-field";
import { mealApi } from "@/lib/api";
import { ApiErrorHandler } from "@/lib/error-handler";
import type { MealFormData, FoodItemFormData } from "@/lib/validations/meal";
import { createMealSchema } from "@/lib/validations/meal";

interface MealFormProps {
  onSuccess?: () => void;
}

export function MealForm({ onSuccess }: MealFormProps) {
  const queryClient = useQueryClient();
  const t = useTranslations("meal");
  const tValidation = useTranslations("meal.form.validation");
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const mealSchema = React.useMemo(
    () => createMealSchema((key) => tValidation(key)),
    [tValidation],
  );

  const mealTypeItems = [
    { value: "breakfast" as const, label: t("form.meal_type.breakfast") },
    { value: "lunch" as const, label: t("form.meal_type.lunch") },
    { value: "dinner" as const, label: t("form.meal_type.dinner") },
    { value: "snack" as const, label: t("form.meal_type.snack") },
  ];

  const form = useForm({
    defaultValues: {
      date: new Date(),
      mealTime: dayjs().format("HH:mm"),
      mealType: "breakfast" as const,
      items: [
        {
          food: "",
          quantity: "",
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0 },
        },
      ],
    },
    validators: {
      onSubmit: mealSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      createMeal(value);
    },
    onSubmitInvalid: ({ formApi }) => {
      const fieldMeta = formApi.state.fieldMeta;
      const errors = Object.values(fieldMeta ?? {})
        .flatMap((meta) => meta?.errors ?? [])
        .filter(Boolean);
      const messages = errors
        .map((e) => (typeof e === "string" ? e : e.message))
        .filter(Boolean);
      if (messages.length > 0) {
        setSubmitError(messages.join(". "));
      }
    },
  });

  // Mutation for creating meal
  const { mutate: createMeal, isPending } = useMutation({
    mutationFn: async (data: MealFormData) => {
      // Combine date and time
      const [hours, minutes] = data.mealTime.split(":").map(Number);
      const combinedDate = dayjs(data.date)
        .hour(hours)
        .minute(minutes)
        .second(0)
        .millisecond(0);

      return mealApi.create({
        date: combinedDate.toISOString(),
        mealType: data.mealType,
        items: data.items.map((item: FoodItemFormData) => ({
          ...item,
          calories: item.calories || 0,
          macros: {
            protein: item.macros?.protein || 0,
            carbs: item.macros?.carbs || 0,
            fats: item.macros?.fats || 0,
          },
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meals"] });
      form.reset();
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      const errorMessage = ApiErrorHandler.handle(error);
      setSubmitError(errorMessage);
      console.error("Failed to log meal:", errorMessage);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitError(null);
        form.handleSubmit();
      }}
      className="space-y-6"
    >
      {submitError && (
        <div
          role="alert"
          className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-md"
        >
          {submitError}
        </div>
      )}

      <div className="flex space-x-16">
        <div className="flex flex-col space-y-2">
          <FieldLabel htmlFor="date">{t("form.date_time_label")}</FieldLabel>
          <div className="flex flex-wrap gap-4">
            <form.Field name="date">
              {(field) => (
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
              {(field) => (
                <div className="space-y-2">
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    type="time"
                    id="mealTime"
                    data-testid="meal-time"
                    className="w-full md:w-[120px]"
                  />
                  <FieldInfo field={field} />
                </div>
              )}
            </form.Field>
          </div>
        </div>
        <div className="flex flex-col space-y-2">
          <FieldLabel>{t("form.meal_type_label")}</FieldLabel>
          <form.Field name="mealType">
            {(field) => (
              <div className="space-y-2">
                <Select
                  items={mealTypeItems}
                  value={field.state.value}
                  onValueChange={(e: string | null) => {
                    field.handleChange(
                      (e ?? "breakfast") as Parameters<
                        typeof field.handleChange
                      >[0],
                    );
                  }}
                >
                  <SelectTrigger className="w-full">
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

      <form.Field name="items" mode="array">
        {(field) => (
          <div className="space-y-4">
            {field.state.value.map((_, index) => (
              <Card key={index} className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => field.removeValue(index)}
                  disabled={field.state.value.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">
                    {t("form.food_item_title", { index: index + 1 })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2 col-span-2">
                    <FieldLabel>{t("form.food_name_label")}</FieldLabel>
                    <form.Field name={`items[${index}].food`}>
                      {(subField) => (
                        <Field>
                          <Input
                            value={subField.state.value}
                            onChange={(e) =>
                              subField.handleChange(e.target.value)
                            }
                            onBlur={subField.handleBlur}
                            placeholder={t("form.food.placeholder")}
                            data-testid="meal-food"
                          />
                          <FieldInfo field={subField} />
                        </Field>
                      )}
                    </form.Field>
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>{t("form.quantity.label")}</FieldLabel>
                    <form.Field name={`items[${index}].quantity`}>
                      {(subField) => (
                        <Field>
                          <Input
                            value={subField.state.value}
                            onChange={(e) =>
                              subField.handleChange(e.target.value)
                            }
                            onBlur={subField.handleBlur}
                            placeholder={t("form.quantity.placeholder")}
                            data-testid="meal-quantity"
                          />
                          <FieldInfo field={subField} />
                        </Field>
                      )}
                    </form.Field>
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>{t("form.calories.label")}</FieldLabel>
                    <form.Field name={`items[${index}].calories`}>
                      {(subField) => (
                        <Field>
                          <Input
                            value={subField.state.value}
                            onChange={(e) =>
                              subField.handleChange(Number(e.target.value))
                            }
                            onBlur={subField.handleBlur}
                            type="number"
                            placeholder={t("form.calories.placeholder")}
                            data-testid="meal-calories"
                          />
                          <FieldInfo field={subField} />
                        </Field>
                      )}
                    </form.Field>
                  </div>

                  <div className="space-y-2 col-span-full">
                    <FieldLabel>{t("form.macros.label")}</FieldLabel>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <FieldLabel className="text-xs text-muted-foreground">
                          {t("form.macros.protein")}
                        </FieldLabel>
                        <form.Field name={`items[${index}].macros.protein`}>
                          {(subField) => (
                            <Input
                              value={subField.state.value}
                              onChange={(e) =>
                                subField.handleChange(Number(e.target.value))
                              }
                              onBlur={subField.handleBlur}
                              type="number"
                              data-testid="meal-protein"
                            />
                          )}
                        </form.Field>
                      </div>
                      <div>
                        <FieldLabel className="text-xs text-muted-foreground">
                          {t("form.macros.carbs")}
                        </FieldLabel>
                        <form.Field name={`items[${index}].macros.carbs`}>
                          {(subField) => (
                            <Input
                              value={subField.state.value}
                              onChange={(e) =>
                                subField.handleChange(Number(e.target.value))
                              }
                              onBlur={subField.handleBlur}
                              type="number"
                              data-testid="meal-carbs"
                            />
                          )}
                        </form.Field>
                      </div>
                      <div>
                        <FieldLabel className="text-xs text-muted-foreground">
                          {t("form.macros.fats")}
                        </FieldLabel>
                        <form.Field name={`items[${index}].macros.fats`}>
                          {(subField) => (
                            <Input
                              value={subField.state.value}
                              onChange={(e) =>
                                subField.handleChange(Number(e.target.value))
                              }
                              onBlur={subField.handleBlur}
                              type="number"
                              data-testid="meal-fats"
                            />
                          )}
                        </form.Field>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </form.Field>

      <div className="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
        <form.Field name="items" mode="array">
          {(field) => (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                field.pushValue({
                  food: "",
                  quantity: "",
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0 },
                })
              }
              className="w-full md:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" /> {t("form.add_food_item")}
            </Button>
          )}
        </form.Field>
        <Button
          type="submit"
          disabled={isPending}
          className="w-full md:w-auto md:ml-auto"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("form.log_meal")}
        </Button>
      </div>
    </form>
  );
}
