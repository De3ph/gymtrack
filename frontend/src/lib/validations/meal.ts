import { z } from "zod";

type ValidationTranslator = (key: string) => string;

const createMacrosSchema = (t: ValidationTranslator) =>
  z.object({
    protein: z.number().min(0, t("macro_non_negative")).optional(),
    carbs: z.number().min(0, t("macro_non_negative")).optional(),
    fats: z.number().min(0, t("macro_non_negative")).optional(),
  });

const createFoodItemSchema = (t: ValidationTranslator) =>
  z.object({
    food: z.string().trim().min(1, t("food_required")),
    quantity: z.string().trim().min(1, t("quantity_required")),
    calories: z.number().min(0, t("calories_non_negative")).optional(),
    macros: createMacrosSchema(t).optional(),
  });

export const createMealSchema = (t: ValidationTranslator) =>
  z.object({
    date: z.date(),
    mealTime: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, t("invalid_time_format")),
    mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
    items: z
      .array(createFoodItemSchema(t))
      .min(1, t("items_min_one")),
  });

export type FoodItemFormData = z.infer<ReturnType<typeof createFoodItemSchema>>;
export type MealFormData = z.infer<ReturnType<typeof createMealSchema>>;
