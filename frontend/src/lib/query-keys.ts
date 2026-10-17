/**
 * Centralized React Query cache keys.
 *
 * Every `useQuery` and `invalidateQueries` call site builds its keys through
 * this factory instead of inline array literals.
 *
 * Why:
 * - One naming authority. The same resource can never end up under two
 *   different keys (both `["myClients"]` and `["my-clients"]` used to be live
 *   for the same API call, so mutations only refreshed one of them).
 * - Every domain exposes an `all` prefix entry so `invalidateQueries` can
 *   still wipe a whole resource in one call.
 * - Shapes mirror what the server-side DAL getters accept, which later lets
 *   RSC prefetches reuse the exact same keys.
 *
 * React Query hashes key segments structurally, so objects inside keys are
 * safe (order of properties does not matter, but presence/absence does).
 */

// ---------------------------------------------------------------------------
// Shared param shapes
// ---------------------------------------------------------------------------

export interface ListParams {
  page: number;
  pageSize: number;
  startDate?: string;
  endDate?: string;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface MeasurementFilterParams {
  startDate?: string;
  endDate?: string;
}

export interface ClientDetailFilters {
  dateRange?: { start: string; end: string };
  exerciseType?: string;
  mealType?: string;
}

export interface AdminUsersListParams {
  role?: string;
  period?: "all" | "today" | "week" | "month";
  search?: string;
}

export interface CatalogSearchFilters {
  specialization?: string;
  location?: string;
  minRating?: number;
  availableForNewClients?: boolean;
}

/** Key shape used by the comment thread components (`qk.comments.thread`). */
export type CommentThreadKey = readonly [
  "comments",
  string,
  string | number,
];

// ---------------------------------------------------------------------------
// Factories. `all` entries are prefix roots for invalidateQueries.
// ---------------------------------------------------------------------------

export const qk = {
  /** Signed-in user, seeded from the auth store (profile page). */
  currentUser: ["currentUser"] as const,

  workouts: {
    all: ["workouts"] as const,
    list: (p: ListParams) => ["workouts", "list", p] as const,
    calendar: ["workouts", "calendar"] as const,
    dashboard: (r: DateRange) => ["workouts", "dashboard", r] as const,
  },

  meals: {
    all: ["meals"] as const,
    list: (p: ListParams) => ["meals", "list", p] as const,
    calendar: ["meals", "calendar"] as const,
    byDate: (date: string) => ["meals", "by-date", date] as const,
    dashboard: (r: DateRange) => ["meals", "dashboard", r] as const,
  },

  measurements: {
    all: ["body-measurements"] as const,
    list: (p: ListParams) => ["body-measurements", "list", p] as const,
    chartsAll: ["body-measurements", "charts"] as const,
    charts: (f: MeasurementFilterParams) =>
      ["body-measurements", "charts", { startDate: f.startDate, endDate: f.endDate }] as const,
    latest: ["body-measurements", "latest"] as const,
  },

  /** Trainer's active client relationships. */
  clients: {
    all: ["clients"] as const,
    list: ["clients", "list"] as const,
    dashboard: ["clients", "dashboard"] as const,
    detail: (username: string, filters: ClientDetailFilters = {}) =>
      ["clients", "detail", username, filters] as const,
  },

  /** The signed-in athlete's coach. */
  myTrainer: {
    all: ["my-trainer"] as const,
    detail: ["my-trainer", "detail"] as const,
    dashboard: ["my-trainer", "dashboard"] as const,
  },

  plans: {
    all: ["plans"] as const,
    own: ["plans", "own"] as const,
    assigned: ["plans", "assigned"] as const,
    detail: (planId: string | number) => ["plans", "detail", planId] as const,
    assignments: (planId: string | number) =>
      ["plans", "assignments", planId] as const,
    byClient: (username: string) => ["plans", "client", username] as const,
  },

  trainer: {
    profile: (trainerId: string) => ["trainer", trainerId, "profile"] as const,
    availability: (trainerId: string) =>
      ["trainer", trainerId, "availability"] as const,
    me: {
      profile: ["trainer", "me", "profile"] as const,
      availability: ["trainer", "me", "availability"] as const,
    },
  },

  trainers: {
    all: ["trainers"] as const,
    search: (f: CatalogSearchFilters) => ["trainers", "search", f] as const,
  },

  reviews: {
    all: ["reviews"] as const,
    trainer: (trainerId: string) => ["reviews", "trainer", trainerId] as const,
  },

  coaching: {
    all: ["coaching-requests"] as const,
    requests: (userType: "trainer" | "athlete") =>
      ["coaching-requests", userType] as const,
  },

  comments: {
    all: ["comments"] as const,
    thread: (targetType: "workout" | "meal", targetId: string | number) =>
      ["comments", targetType, targetId] as const satisfies CommentThreadKey,
  },

  exercises: {
    all: ["exercises"] as const,
    search: <T extends object>(p: T) =>
      ["exercises", "search", p] as const,
    muscleGroups: ["exercises", "muscle-groups"] as const,
    equipment: ["exercises", "equipment"] as const,
  },

  admin: {
    all: ["admin"] as const,
    users: {
      all: ["admin", "users"] as const,
      list: (p: AdminUsersListParams) => ["admin", "users", "list", p] as const,
    },
    comments: {
      all: ["admin", "comments"] as const,
      page: (page: number, targetType: string) =>
        ["admin", "comments", "page", page, targetType] as const,
    },
    profile: ["admin", "profile"] as const,
  },
};
