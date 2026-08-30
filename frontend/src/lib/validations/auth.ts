import { z } from "zod"

const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, "Email or username is required")
    .refine(
      (val) => {
        if (/^[\S]+@[\S]+\.[\S]+$/.test(val)) return true;
        if (/^[a-zA-Z0-9]{3,30}$/.test(val)) return true;
        return false;
      },
      "Please enter a valid email or username (3-30 alphanumeric characters)",
    ),
  password: z.string().min(1, "Password is required"),
})

export function createLoginSchema(t: (key: string) => string) {
  return z.object({
    identifier: z
      .string()
      .min(1, t("auth.login.email.error.required"))
      .refine(
        (val) => {
          if (/^[\S]+@[\S]+\.[\S]+$/.test(val)) return true;
          if (/^[a-zA-Z0-9]{3,30}$/.test(val)) return true;
          return false;
        },
        t("auth.login.email.error.invalid"),
      ),
    password: z.string().min(1, t("auth.login.password.error.required")),
  });
}

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

const registerSchema = z
  .object({
    username: z.string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be less than 30 characters")
      .regex(/^[a-zA-Z0-9]+$/, "Username must contain only letters and numbers"),
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

export function createRegisterSchema(t: (key: string) => string) {
  return z
    .object({
      username: z
        .string()
        .min(3, t("auth.register.username.error.min_length"))
        .max(30, t("auth.register.username.error.max_length"))
        .regex(/^[a-zA-Z0-9]+$/, t("auth.register.username.error.invalid")),
      email: z.email(t("auth.register.email.error.invalid")),
      password: z.string().min(8, t("auth.register.password.error.min_length")),
      confirmPassword: z.string(),
      role: z.enum(["trainer", "athlete"]),
      profile: z.object({
        name: z.string().min(1, t("auth.register.name.error.required")),
        age: z.preprocess(checkNaN, z.int().min(0).max(120).optional()),
        weight: z.preprocess(checkNaN, z.number().min(0).max(1000).optional()),
        height: z.preprocess(checkNaN, z.number().min(0).max(1000).optional()),
        fitnessGoals: z.string().optional(),
        certifications: z.string().optional(),
        specializations: z.string().optional(),
      }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("auth.register.confirm_password.error.mismatch"),
      path: ["confirmPassword"],
    });
}

const athleteProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.number().optional(),
  weight: z.number().optional(),
  height: z.number().optional(),
  fitnessGoals: z.string().optional()
})

const trainerProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  certifications: z.string().optional(),
  specializations: z.string().optional()
})

export type LoginFormData = z.infer<typeof loginSchema> & {
  identifier: string
  password: string
}
