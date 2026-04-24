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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldInfo } from "@/components/ui/form-field";
import { mealApi } from "@/lib/api";
import { ApiErrorHandler } from "@/lib/error-handler";
import { DATE_FORMATS } from "@/lib/constants";
import { Meal } from "@/types";

interface EditMealDialogProps {
  meal: Meal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditMealDialog({
  meal,
  open,
  onOpenChange,
}: EditMealDialogProps) {
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
      updateMeal(value);
    },
  });

  // Reset form when meal changes
  React.useEffect(() => {
    if (meal) {
      const mealDate = dayjs(meal.date);
      form.setFieldValue("date", mealDate.format(DATE_FORMATS.DATE_ONLY));
      form.setFieldValue("mealTime", mealDate.format("HH:mm"));
      form.setFieldValue("mealType", meal.mealType as any);
      form.setFieldValue("items", meal.items.map((item) => ({
        food: item.food,
        quantity: item.quantity,
        calories: item.calories || 0,
        macros: {
          protein: item.macros?.protein || 0,
          carbs: item.macros?.carbs || 0,
          fats: item.macros?.fats || 0,
        },
      })) as any);
    }
  }, [meal, form]);

  // Mutation for updating meal
  const { mutate: updateMeal, isPending } = useMutation({
    mutationFn: async (data: any) => {
      if (!meal) return;
      // Combine date and time
      const [hours, minutes] = data.mealTime.split(":").map(Number);
      const combinedDate = dayjs(data.date)
        .hour(hours)
        .minute(minutes)
        .second(0)
        .millisecond(0);

      return mealApi.update(meal.mealId, {
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
      onOpenChange(false);
    },
    onError: (error) => {
      const errorMessage = ApiErrorHandler.handle(error);
      // TODO: Show toast notification with errorMessage
      console.error("Failed to update meal:", errorMessage);
    },
  });

  if (!meal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Meal</DialogTitle>
          <DialogDescription>
            Update your meal details. Changes can only be made within 24 hours
            of logging.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-6 mt-4"
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
                              {(subField: any) => (
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
            <div className="flex space-x-2 md:ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
