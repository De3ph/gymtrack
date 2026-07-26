import api from "./api-client";
import {
  WorkoutPlan,
  WorkoutPlanAssignment,
  CreateWorkoutPlanRequest,
  UpdateWorkoutPlanRequest,
  AssignPlanRequest,
  WorkoutPlanListResponse,
  AssignmentListResponse,
  Workout,
  MessageResponse,
} from "@/types";

export const workoutPlanApi = {
  create: (data: CreateWorkoutPlanRequest) =>
    api.post<WorkoutPlan>("/workout-plans", data),

  getAll: () =>
    api.get<WorkoutPlanListResponse>("/workout-plans"),

  getById: (id: string | number) =>
    api.get<WorkoutPlan>(`/workout-plans/${id}`),

  update: (id: string | number, data: UpdateWorkoutPlanRequest) =>
    api.put<WorkoutPlan>(`/workout-plans/${id}`, data),

  delete: (id: string | number) =>
    api.delete<MessageResponse>(`/workout-plans/${id}`),

  assign: (id: string | number, data: AssignPlanRequest) =>
    api.post<AssignmentListResponse>(`/workout-plans/${id}/assign`, data),

  getAssignments: (id: string | number) =>
    api.get<AssignmentListResponse>(`/workout-plans/${id}/assignments`),

  getMyPlans: () =>
    api.get<WorkoutPlanListResponse>("/workout-plans/assigned"),

  startWorkout: (id: string | number) =>
    api.post<Workout>(`/workout-plans/${id}/start`, {}),

  getClientPlans: (username: string) =>
    api.get<WorkoutPlanListResponse>(`/clients/${username}/workout-plans`),
};
