export const TIME_LIMITS = {
  /** Body measurements stay editable for 7 days after logging. */
  EDIT_WINDOW_HOURS: 24 * 7,
  DEFAULT_REST_SECONDS: 60,
  DEFAULT_REPS: 10,
  COPY_FEEDBACK_MS: 2000,
} as const;

export const API = {
  DEFAULT_TIMEOUT_MS: 5000,
} as const;

export const TARGET_TYPES = {
  WORKOUT: "workout",
  MEAL: "meal",
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

export const DATE_FORMATS = {
  DATE_ONLY: "YYYY-MM-DD",
  TIME_ONLY: "HH:mm",
  DATE_TIME: "YYYY-MM-DD HH:mm"
} as const;

export const PAGINATION = {
  BODY_MEASUREMENT_PAGE_SIZE: 10,
  BODY_MEASUREMENT_CHART_LIMIT: 365,
  WORKOUT_PAGE_SIZE: 10,
  MEAL_PAGE_SIZE: 10,
  /**
   * Row budget for the admin users table. Both the RSC seed
   * (getAdminUsers) and the client query (users-table-provider.tsx) must
   * use this, otherwise the seeded cache serves a truncated response as
   * if it were the complete list.
   */
  ADMIN_USERS_PAGE_SIZE: 500
} as const;

export const BODY_PARTS = [
  { key: "chest", labelKey: "chest" },
  { key: "waist", labelKey: "waist" },
  { key: "hips", labelKey: "hips" },
  { key: "neck", labelKey: "neck" },
  { key: "shoulders", labelKey: "shoulders" },
  { key: "bicepLeft", labelKey: "bicepLeft" },
  { key: "bicepRight", labelKey: "bicepRight" },
  { key: "forearmLeft", labelKey: "forearmLeft" },
  { key: "forearmRight", labelKey: "forearmRight" },
  { key: "thighLeft", labelKey: "thighLeft" },
  { key: "thighRight", labelKey: "thighRight" },
  { key: "calfLeft", labelKey: "calfLeft" },
  { key: "calfRight", labelKey: "calfRight" }
] as const;


