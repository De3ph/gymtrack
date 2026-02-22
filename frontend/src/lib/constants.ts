export const TIME_LIMITS = {
  EDIT_WINDOW_HOURS: 24,
  DEFAULT_REST_SECONDS: 60,
  DEFAULT_REPS: 10,
  COPY_FEEDBACK_MS: 2000,
} as const;

export const API = {
  DEFAULT_TIMEOUT_MS: 5000,
} as const;

export const ROLES = {
  TRAINER: "trainer",
  ATHLETE: "athlete",
} as const;

export const TARGET_TYPES = {
  WORKOUT: "workout",
  MEAL: "meal",
} as const;

export const MEAL_TYPES = {
  BREAKFAST: "breakfast",
  LUNCH: "lunch",
  DINNER: "dinner",
  SNACK: "snack",
} as const;

export const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const REQUEST_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
} as const;
