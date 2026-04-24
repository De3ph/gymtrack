// Centralized route constants for the GymTrack application

// Static routes - exact paths without parameters
export const ROUTES = {
  // Auth routes
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',

  // Profile routes
  PROFILE: '/profile',

  // Athlete routes
  ATHLETE_WORKOUTS: '/athlete/workouts',
  ATHLETE_MEALS: '/athlete/meals',
  ATHLETE_TRAINERS: '/athlete/trainers',
  ATHLETE_REQUESTS: '/athlete/requests',

  // Trainer routes
  TRAINER_CLIENTS: '/trainer/clients',
  TRAINER_PROFILE: '/trainer/profile',
  TRAINER_REQUESTS: '/trainer/requests',
} as const;

// Dynamic route builders - for routes with parameters
export const DYNAMIC_ROUTES = {
  // Athlete viewing specific trainer
  ATHLETE_TRAINER_DETAIL: (id: string) => `/athlete/my-trainer/${id}`,
  ATHLETE_TRAINERS_DETAIL: (id: string) => `/athlete/trainers/${id}`,

  // Trainer viewing specific client
  TRAINER_CLIENT_DETAIL: (id: string) => `/trainer/client/${id}`,
} as const;

// Type definitions for route safety
export type StaticRoute = typeof ROUTES[keyof typeof ROUTES];
export type DynamicRouteKey = keyof typeof DYNAMIC_ROUTES;

// Helper function to build dynamic routes with type safety
export function buildRoute<T extends DynamicRouteKey>(
  key: T,
  param: string
): string {
  return DYNAMIC_ROUTES[key](param);
}
