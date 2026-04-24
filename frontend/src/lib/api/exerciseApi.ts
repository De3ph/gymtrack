import api from "./index";
import {
  ExerciseLibrary,
  ExerciseListResponse,
  ExerciseSearchParams,
  MuscleGroupListResponse,
  EquipmentTypeListResponse,
  MuscleGroup,
  Equipment,
  CreateExerciseRequest
} from "@/types";

export const exerciseApi = {
  // Get all muscle groups
  getMuscleGroups: async () => {
    return api.get<MuscleGroup[]>("/muscle-groups");
  },

  // Get all equipment types
  getEquipment: async () => {
    return api.get<Equipment[]>("/equipment");
  },

  // Get all exercises with optional filtering
  getAll: async (params?: ExerciseSearchParams) => {
    return api.get<ExerciseListResponse>("/exercises", { params });
  },

  // Get exercise by ID
  getById: async (id: string) => {
    return api.get<ExerciseLibrary>(`/exercises/${id}`);
  },

  // Search exercises with query, muscle group, equipment filters
  search: async (params: ExerciseSearchParams) => {
    return api.get<ExerciseLibrary[]>("/exercises/search", { params });
  },

  // Get exercises by muscle group
  getByMuscleGroup: async (muscleGroupId: number) => {
    return api.get<ExerciseListResponse>(`/exercises/muscle-group/${muscleGroupId}`);
  },

  // Get exercises by equipment type
  getByEquipment: async (equipmentId: number) => {
    return api.get<ExerciseListResponse>(`/exercises/equipment/${equipmentId}`);
  },

  // Create custom exercise (requires authentication)
  create: async (data: CreateExerciseRequest) => {
    return api.post<ExerciseLibrary>("/exercises", data);
  },

  // Update exercise (for custom exercises only)
  update: async (id: string, data: Partial<CreateExerciseRequest>) => {
    return api.put<ExerciseLibrary>(`/exercises/${id}`, data);
  },

  // Delete custom exercise (for custom exercises only)
  delete: async (id: string) => {
    return api.delete<{ message: string }>(`/exercises/${id}`);
  },
};
