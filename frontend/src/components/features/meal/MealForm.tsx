"use client";

import * as React from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import dayjs from "dayjs";
import { formatDate } from "@/lib/i18n/dayjs";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { mealApi } from "@/lib/api";
import { ApiErrorHandler } from "@/lib/error-handler";
import type { MealFormData, FoodItemFormData } from "@/lib/validations/meal";
import { createMealSchema } from "@/lib/validations/meal";
import { FoodItemCard } from "./FoodItemCard";
import { MealFormFields } from "./MealFormFields";

interface MealFormProps {
  onSuccess?: () => void;
  onClear?: () => void;
}

export function MealForm({ onSuccess, onClear }: MealFormProps) {
  const queryClient = useQueryClient();
  const t = useTranslations("meal");
  const tValidation = useTranslations("meal.form.validation");
  const tCommon = useTranslations("common.actions");
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
      mealTime: formatDate(new Date(), "HH:mm"),
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

  const { mutate: createMeal, isPending } = useMutation({
    mutationFn: async (data: MealFormData) => {
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
          className="border border-destructive/20 bg-destructive/10 p-3 font-mono text-xs leading-4 text-destructive rounded-none"
        >
          {submitError}
        </div>
      )}

      <MealFormFields form={form} t={t} mealTypeItems={mealTypeItems} />

      <Separator />

      <form.Field name="items" mode="array">
        {(field) => (
          <div className="space-y-4">
            {field.state.value.map((_, index) => (
              <FoodItemCard
                key={index}
                form={form}
                index={index}
                onRemove={() => field.removeValue(index)}
                canRemove={field.state.value.length > 1}
                t={t}
                testIdPrefix="meal"
              />
            ))}
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
              className="w-full rounded-none border-border font-mono text-xs uppercase tracking-[0.18em]"
            >
              <Plus className="size-5" aria-hidden="true" /> {t("form.add_food_item")}
            </Button>
          </div>
        )}
      </form.Field>

      <Separator />

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            form.reset();
            onClear?.();
          }}
          className="w-full rounded-none font-mono text-xs uppercase tracking-[0.18em] sm:w-auto"
        >
          {tCommon("clear")}
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="w-full rounded-none font-mono text-xs uppercase tracking-[0.18em] sm:w-auto sm:ml-auto"
        >
          {isPending && <Spinner className="mr-2" />}
          {t("form.log_meal")}
        </Button>
      </div>
    </form>
  );
}
