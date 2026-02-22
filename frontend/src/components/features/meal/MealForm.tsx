"use client";

import * as React from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2 } from "lucide-react";
import dayjs from "dayjs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mealSchema, type MealFormData } from "@/lib/validations/meal";
import { mealApi } from "@/lib/api";
import { ApiErrorHandler } from "@/lib/error-handler";
import { cn } from "@/lib/utils";

interface MealFormProps {
  onSuccess?: () => void;
}

export function MealForm({ onSuccess }: MealFormProps) {
  const queryClient = useQueryClient();

  const form = useForm<MealFormData>({
    resolver: zodResolver(mealSchema),
    defaultValues: {
      date: dayjs().toDate(),
      mealTime: dayjs().format("HH:mm"),
      mealType: "breakfast",
      items: [
        {
          food: "",
          quantity: "",
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0 },
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Mutation for creating meal
  const { mutate: createMeal, isPending } = useMutation({
    mutationFn: (data: MealFormData) => mapAndSubmit(data),
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

  const mapAndSubmit = async (data: MealFormData) => {
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
      items: data.items.map((item) => ({
        ...item,
        calories: item.calories || 0,
        macros: {
          protein: item.macros?.protein || 0,
          carbs: item.macros?.carbs || 0,
          fats: item.macros?.fats || 0,
        },
      })),
    });
  };

  const onSubmit = (data: MealFormData) => {
    createMeal(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex flex-col space-y-2">
        <Label htmlFor="date">Meal Date & Time</Label>
        <div className="flex flex-wrap gap-4">
          <Input
            type="date"
            id="date"
            {...form.register("date", { valueAsDate: true })}
            className="w-full md:w-[180px]"
          />
          <Input
            type="time"
            id="mealTime"
            {...form.register("mealTime")}
            className="w-full md:w-[120px]"
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            {...form.register("mealType")}
          >
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="snack">Snack</option>
          </select>
        </div>
        {(form.formState.errors.date || form.formState.errors.mealTime) && (
          <p className="text-sm text-destructive">
            {form.formState.errors.date?.message ||
              form.formState.errors.mealTime?.message}
          </p>
        )}
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <Card key={field.id} className="relative">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => remove(index)}
              disabled={fields.length === 1}
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
                <Label>Food Name</Label>
                <Input
                  placeholder="e.g. Oatmeal"
                  {...form.register(`items.${index}.food`)}
                  className={cn(
                    form.formState.errors.items?.[index]?.food &&
                      "border-destructive",
                  )}
                />
                {form.formState.errors.items?.[index]?.food && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.items[index]?.food?.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  placeholder="e.g. 1 cup"
                  {...form.register(`items.${index}.quantity`)}
                />
              </div>

              <div className="space-y-2">
                <Label>Calories</Label>
                <Input
                  type="number"
                  placeholder="e.g. 150"
                  {...form.register(`items.${index}.calories`, {
                    valueAsNumber: true,
                  })}
                />
              </div>

              <div className="space-y-2 col-span-full">
                <Label>Macros (g)</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Protein
                    </Label>
                    <Input
                      type="number"
                      {...form.register(`items.${index}.macros.protein`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Carbs
                    </Label>
                    <Input
                      type="number"
                      {...form.register(`items.${index}.macros.carbs`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Fats
                    </Label>
                    <Input
                      type="number"
                      {...form.register(`items.${index}.macros.fats`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            append({
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
