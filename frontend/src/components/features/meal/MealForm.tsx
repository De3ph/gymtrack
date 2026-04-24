"use client";

import * as React from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2 } from "lucide-react";
import dayjs from "dayjs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "@/components/ui/combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldInfo } from "@/components/ui/form-field";
import { mealSchema, type MealFormData } from "@/lib/validations/meal";
import { mealApi } from "@/lib/api";
import { ApiErrorHandler } from "@/lib/error-handler";
import { DATE_FORMATS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface MealFormProps {
  onSuccess?: () => void;
}

export function MealForm({ onSuccess }: MealFormProps) {
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      date: dayjs().format(DATE_FORMATS.DATE_ONLY),
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
    onSubmit: async ({ value }) => {
      createMeal(value);
    },
  });

  // Mutation for creating meal
  const { mutate: createMeal, isPending } = useMutation({
    mutationFn: async (data: any) => {
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
        items: data.items.map((item: any) => ({
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
      // TODO: Show toast notification with errorMessage
      console.error("Failed to log meal:", errorMessage);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="space-y-6"
    >
      <div className="flex flex-col space-y-2">
        <FieldLabel htmlFor="date">Meal Date & Time</FieldLabel>
        <div className="flex flex-wrap gap-4">
          <form.Field name="date">
            {(field) => (
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type="date"
                id="date"
                className="w-full md:w-[180px]"
              />
            )}
          </form.Field>
          <form.Field name="mealTime">
            {(field) => (
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type="time"
                id="mealTime"
                className="w-full md:w-[120px]"
              />
            )}
          </form.Field>
          <form.Field name="mealType">
            {(field) => (
              <Combobox>
                <ComboboxInput
                  placeholder="Select meal type"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value as any)}
                  onBlur={field.handleBlur}
                />
                <ComboboxContent>
                  <ComboboxList>
                    <ComboboxItem value="breakfast">Breakfast</ComboboxItem>
                    <ComboboxItem value="lunch">Lunch</ComboboxItem>
                    <ComboboxItem value="dinner">Dinner</ComboboxItem>
                    <ComboboxItem value="snack">Snack</ComboboxItem>
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
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
                    Food Item {index + 1}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2 col-span-2">
                    <FieldLabel>Food Name</FieldLabel>
                    <form.Field name={`items[${index}].food`}>
                      {(subField) => (
                        <Field>
                          <Input
                            value={subField.state.value}
                            onChange={(e) => subField.handleChange(e.target.value)}
                            onBlur={subField.handleBlur}
                            placeholder="e.g. Oatmeal"
                          />
                          <FieldInfo field={subField} />
                        </Field>
                      )}
                    </form.Field>
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>Quantity</FieldLabel>
                    <form.Field name={`items[${index}].quantity`}>
                      {(subField) => (
                        <Input
                          value={subField.state.value}
                          onChange={(e) => subField.handleChange(e.target.value)}
                          onBlur={subField.handleBlur}
                          placeholder="e.g. 1 cup"
                        />
                      )}
                    </form.Field>
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>Calories</FieldLabel>
                    <form.Field name={`items[${index}].calories`}>
                      {(subField) => (
                        <Input
                          value={subField.state.value}
                          onChange={(e) => subField.handleChange(Number(e.target.value))}
                          onBlur={subField.handleBlur}
                          type="number"
                          placeholder="e.g. 150"
                        />
                      )}
                    </form.Field>
                  </div>

                  <div className="space-y-2 col-span-full">
                    <FieldLabel>Macros (g)</FieldLabel>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <FieldLabel className="text-xs text-muted-foreground">
                          Protein
                        </FieldLabel>
                        <form.Field name={`items[${index}].macros.protein`}>
                          {(subField) => (
                            <Input
                              value={subField.state.value}
                              onChange={(e) => subField.handleChange(Number(e.target.value))}
                              onBlur={subField.handleBlur}
                              type="number"
                            />
                          )}
                        </form.Field>
                      </div>
                      <div>
                        <FieldLabel className="text-xs text-muted-foreground">
                          Carbs
                        </FieldLabel>
                        <form.Field name={`items[${index}].macros.carbs`}>
                          {(subField) => (
                            <Input
                              value={subField.state.value}
                              onChange={(e) => subField.handleChange(Number(e.target.value))}
                              onBlur={subField.handleBlur}
                              type="number"
                            />
                          )}
                        </form.Field>
                      </div>
                      <div>
                        <FieldLabel className="text-xs text-muted-foreground">
                          Fats
                        </FieldLabel>
                        <form.Field name={`items[${index}].macros.fats`}>
                          {(subField) => (
                            <Input
                              value={subField.state.value}
                              onChange={(e) => subField.handleChange(Number(e.target.value))}
                              onBlur={subField.handleBlur}
                              type="number"
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
              <Plus className="mr-2 h-4 w-4" /> Add Food Item
            </Button>
          )}
        </form.Field>
        <Button
          type="submit"
          disabled={isPending}
          className="w-full md:w-auto md:ml-auto"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Log Meal
        </Button>
      </div>
    </form>
  );
}
