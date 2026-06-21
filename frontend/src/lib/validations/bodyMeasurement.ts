import { z } from "zod";

const bodyPartSchema = z.object({
  value: z
    .number()
    .min(0, "Value cannot be negative")
    .max(500, "Value is unrealistically large")
});

export const bodyMeasurementSchema = z.object({
  date: z.date(),
  measurementTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  weight: z
    .number()
    .positive("Weight must be greater than 0")
    .max(1000, "Weight is unrealistically large"),
  weightUnit: z.enum(["kg", "lbs"]),
  bodyFatPct: z
    .number()
    .min(0, "Body fat cannot be negative")
    .max(100, "Body fat cannot exceed 100%")
    .optional(),
  parts: z
    .record(z.string(), bodyPartSchema)
    .optional(),
  notes: z
    .string()
    .max(500, "Notes cannot exceed 500 characters")
    .optional()
});

export type BodyMeasurementFormData = z.infer<typeof bodyMeasurementSchema>;
