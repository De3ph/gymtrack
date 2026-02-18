import { z } from "zod";

export const macrosSchema = z.object({
  protein: z.number().min(0).optional(),
  carbs: z.number().min(0).optional(),
  fats: z.number().min(0).optional(),
});

export const foodItemSchema = z.object({
  food: z.string().min(1, "Food name is required"),
  quantity: z.string().min(1, "Quantity is required"),
  calories: z.number().min(0).optional(),
  macros: macrosSchema.optional(),
});

export const mealSchema = z.object({
  date: z.date(),
  mealTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  items: z.array(foodItemSchema).min(1, "At least one food item is required"),
});

export type FoodItemFormData = z.infer<typeof foodItemSchema>;
export type MealFormData = z.infer<typeof mealSchema>;
