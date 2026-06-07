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

export const DATE_FORMATS = {
  DATE_ONLY: "YYYY-MM-DD",
  TIME_ONLY: "HH:mm",
  DATE_TIME: "YYYY-MM-DD HH:mm"
} as const;

export const PAGINATION = {
  BODY_MEASUREMENT_PAGE_SIZE: 10,
  BODY_MEASUREMENT_CHART_LIMIT: 365
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

export const PART_LABEL_KEYS = BODY_PARTS.reduce(
  (acc, p) => {
    acc[p.key] = p.labelKey;
    return acc;
  },
  {} as Record<string, string>
);
