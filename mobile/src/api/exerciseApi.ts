import { apiRequest } from "./client";
import type { Equipment, ExerciseLibrary, MuscleGroup } from "@/types";

/**
 * Exercise catalog API — mirrors `frontend/src/lib/api/exerciseApi.ts`.
 *
 * Backend contract notes (verified against
 * `backend/internal/api/routes/exercise_routes.go` and
 * `backend/internal/api/handlers/exercise_handler.go`):
 * - GET /exercises, /muscle-groups, /equipment return BARE ARRAYS
 *   (`c.JSON(200, exercises)`), not `{ exercises, count }` envelopes.
 * - GET /exercises/search accepts only query/muscleGroupId/equipmentId —
 *   category filtering is client-side (see web `ExerciseLibraryFilters`).
 * - GET /exercises/muscle-group/:id and /equipment/:id exist but the library
 *   screens fetch the catalog once and filter locally (one round trip, no
 *   per-keystroke requests).
 * - Detail fetch returns null only on genuine 404; every other failure
 *   rejects so callers can show a DataError instead of a wrong "not found".
 */
export const exerciseApi = {
  getAll: () => apiRequest<ExerciseLibrary[]>("/exercises"),

  getById: (id: string | number) =>
    apiRequest<ExerciseLibrary>(`/exercises/${id}`),

  getMuscleGroups: () => apiRequest<MuscleGroup[]>("/muscle-groups"),

  getEquipment: () => apiRequest<Equipment[]>("/equipment"),

  search: (params?: Record<string, string>) =>
    apiRequest<ExerciseLibrary[]>("/exercises/search", { params }),

  getByMuscleGroup: (muscleGroupId: number) =>
    apiRequest<ExerciseLibrary[]>(`/exercises/muscle-group/${muscleGroupId}`),

  getByEquipment: (equipmentId: number) =>
    apiRequest<ExerciseLibrary[]>(`/exercises/equipment/${equipmentId}`),
};
