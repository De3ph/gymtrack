import { z } from "zod"

export const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required")
})

const checkNaN = (val: unknown) => {
  if (val === undefined || val === null || val === '') {
    return undefined;
  }

  const num = Number(val);
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    return undefined;
  }

  return num;
}

export const registerSchema = z
  .object({
    email: z.email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    role: z.enum(["trainer", "athlete"]),
    profile: z.object({
      name: z.string().min(1, "Name is required"),
      age: z.preprocess(
        checkNaN,
        z
          .int()
          .min(0, "Age must be a positive number")
          .max(120, "Age must be less than 120")
          .optional()
      ),
      weight: z.preprocess(
        checkNaN,
        z
          .number()
          .min(0, "Weight must be a positive number")
          .max(1000, "Weight must be less than 1000 kg")
          .optional()
      ),
      height: z.preprocess(
        checkNaN,
        z
          .number()
          .min(0, "Height must be a positive number")
          .max(1000, "Height must be less than 1000 kg")
          .optional()
      ),
      fitnessGoals: z.string().optional(),
      certifications: z.string().optional(),
      specializations: z.string().optional()
    })
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
  })

export const athleteProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.number().optional(),
  weight: z.number().optional(),
  height: z.number().optional(),
  fitnessGoals: z.string().optional()
})

export const trainerProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  certifications: z.string().optional(),
  specializations: z.string().optional()
})

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema> & {
  profile: {
    age?: number | string | undefined
    weight?: number | string | undefined
    height?: number | string | undefined
  }
}
export type AthleteProfileFormData = z.infer<typeof athleteProfileSchema>
export type TrainerProfileFormData = z.infer<typeof trainerProfileSchema>
