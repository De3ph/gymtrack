// Centralized route constants for the GymTrack application

// Static routes - exact paths without parameters
export const ROUTES = {
  // Auth routes
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',

  // Profile routes
  PROFILE: '/profile',
  DASHBOARD: '/',

  // Athlete routes
  ATHLETE_WORKOUTS: '/athlete/workouts',
  ATHLETE_MEALS: '/athlete/meals',
  ATHLETE_MEASUREMENTS: '/athlete/measurements',
  ATHLETE_TRAINERS: '/athlete/trainers',
  ATHLETE_REQUESTS: '/athlete/requests',

  // Trainer routes
  TRAINER_CLIENTS: '/trainer/clients',
  TRAINER_PROFILE: '/trainer/profile',
  TRAINER_REQUESTS: '/trainer/requests',
  TRAINER_WORKOUT_PLANS: '/trainer/workout-plans',

  // Athlete workout plans
  ATHLETE_WORKOUT_PLANS: '/athlete/workout-plans',

  // Admin routes
  ADMIN_DASHBOARD: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_PROFILE: '/admin/profile',
} as const;

// Dynamic route builders - for routes with parameters
export const DYNAMIC_ROUTES = {
  // Athlete viewing specific trainer
  ATHLETE_TRAINER_DETAIL: (id: string | number) => `/athlete/my-trainer/${id}`,
  ATHLETE_TRAINERS_DETAIL: (id: string | number) => `/athlete/trainers/${id}`,

  // Trainer viewing specific client
  TRAINER_CLIENT_DETAIL: (username: string | number) => `/trainer/client/${username}`,

  // Trainer viewing specific workout plan
  TRAINER_WORKOUT_PLAN_DETAIL: (id: string | number) => `/trainer/workout-plans/${id}`,
} as const;

// Type definitions for route safety
export type StaticRoute = typeof ROUTES[keyof typeof ROUTES];
export type DynamicRouteKey = keyof typeof DYNAMIC_ROUTES;

// Helper function to build dynamic routes with type safety
export function buildRoute<T extends DynamicRouteKey>(
  key: T,
  param: string | number
): string {
  return DYNAMIC_ROUTES[key](param);
}
