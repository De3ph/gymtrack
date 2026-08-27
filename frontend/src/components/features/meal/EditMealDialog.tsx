"use client";

import * as React from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import dayjs from "dayjs";
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { mealApi } from "@/lib/api"
import { ApiErrorHandler } from "@/lib/error-handler"
import { Meal } from "@/types"
import type { MealFormData } from "@/lib/validations/meal"
import { createMealSchema } from "@/lib/validations/meal"
import { FoodItemCard } from "./FoodItemCard"
import { EditMealHeader } from "./EditMealHeader"

interface EditMealDialogProps {
  meal: Meal | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditMealDialog({
  meal,
  open,
  onOpenChange
}: EditMealDialogProps) {
  const t = useTranslations("meal")
  const tValidation = useTranslations("meal.form.validation")
  const queryClient = useQueryClient()
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  const mealSchema = React.useMemo(
    () => createMealSchema((key) => tValidation(key)),
    [tValidation],
  )

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
          macros: { protein: 0, carbs: 0, fats: 0 }
        }
      ]
    },
    validators: {
      onSubmit: mealSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null)
      updateMeal(value)
    }
  })

  // Reset form when meal changes
  React.useEffect(() => {
    if (meal) {
      const mealDate = dayjs(meal.date)
      form.setFieldValue("date", mealDate.toDate())
      form.setFieldValue("mealTime", mealDate.format("HH:mm"))
      form.setFieldValue("mealType", meal.mealType as "breakfast")
      form.setFieldValue(
        "items",
        meal.items.map((item): { food: string; quantity: string; calories: number; macros: { protein: number; carbs: number; fats: number } } => ({
          food: item.food,
          quantity: item.quantity,
          calories: item.calories || 0,
          macros: {
            protein: item.macros?.protein || 0,
            carbs: item.macros?.carbs || 0,
            fats: item.macros?.fats || 0
          }
        }))
      )
    }
  }, [meal, form])

  // Mutation for updating meal
  const { mutate: updateMeal, isPending } = useMutation({
    mutationFn: async (data: MealFormData) => {
      if (!meal) return
      // Combine date and time
      const [hours, minutes] = data.mealTime.split(":").map(Number)
      const combinedDate = dayjs(data.date)
        .hour(hours)
        .minute(minutes)
        .second(0)
        .millisecond(0)

      return mealApi.update(meal.mealId, {
        date: combinedDate.toISOString(),
        mealType: data.mealType,
        items: data.items.map((item) => ({
          ...item,
          calories: item.calories || 0,
          macros: {
            protein: item.macros?.protein || 0,
            carbs: item.macros?.carbs || 0,
            fats: item.macros?.fats || 0
          }
        }))
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meals"] })
      onOpenChange(false)
    },
    onError: (error) => {
      const errorMessage = ApiErrorHandler.handle(error)
      setSubmitError(errorMessage)
      console.error("Failed to update meal:", errorMessage)
    }
  })

  if (!meal) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-none border border-border shadow-none">
        <DialogHeader>
          <DialogTitle className="font-mono text-xs uppercase tracking-[0.18em] text-foreground font-normal">{t("edit_dialog.title")}</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-muted-foreground">{t("edit_dialog.description")}</DialogDescription>
        </DialogHeader>

        {submitError && (
          <div
            role="alert"
            className="border border-destructive/20 bg-destructive/10 p-3 font-mono text-xs leading-4 text-destructive rounded-none"
          >
            {submitError}
          </div>
        )}

        <Separator />

        <form
          onSubmit={(e) => {
            e.preventDefault()
            setSubmitError(null)
            form.handleSubmit()
          }}
          className="space-y-6 mt-4"
        >
          <EditMealHeader form={form} t={t} />

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
                    testIdPrefix="edit-meal"
                  />
                ))}
              </div>
            )}
          </form.Field>

          <Separator />

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
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
                      macros: { protein: 0, carbs: 0, fats: 0 }
                    })
                  }
                  className="w-full rounded-none border-border font-mono text-xs uppercase tracking-[0.18em] sm:w-auto"
                >
                  <Plus className="size-3.5" aria-hidden="true" /> {t("form.add_food_item")}
                </Button>
              )}
            </form.Field>
            <div className="flex gap-2 sm:ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-none font-mono text-xs uppercase tracking-[0.18em]"
              >
                {t("edit_dialog.cancel")}
              </Button>
              <Button type="submit" disabled={isPending} className="rounded-none font-mono text-xs uppercase tracking-[0.18em]">
                {isPending && <Spinner className="mr-2" />}
                {t("edit_dialog.save_changes")}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
