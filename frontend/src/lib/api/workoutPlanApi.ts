import api from "./index";
import {
  WorkoutPlan,
  WorkoutPlanAssignment,
  CreateWorkoutPlanRequest,
  UpdateWorkoutPlanRequest,
  AssignPlanRequest,
  WorkoutPlanListResponse,
  AssignmentListResponse,
  Workout,
} from "@/types";
import { MessageResponse } from "./api-types";

export const workoutPlanApi = {
  create: (data: CreateWorkoutPlanRequest) =>
    api.post<WorkoutPlan>("/workout-plans", data),

  getAll: () =>
    api.get<WorkoutPlanListResponse>("/workout-plans"),

  getById: (id: string) =>
    api.get<WorkoutPlan>(`/workout-plans/${id}`),

  update: (id: string, data: UpdateWorkoutPlanRequest) =>
    api.put<WorkoutPlan>(`/workout-plans/${id}`, data),

  delete: (id: string) =>
    api.delete<MessageResponse>(`/workout-plans/${id}`),

  assign: (id: string, data: AssignPlanRequest) =>
    api.post<AssignmentListResponse>(`/workout-plans/${id}/assign`, data),

  getAssignments: (id: string) =>
    api.get<AssignmentListResponse>(`/workout-plans/${id}/assignments`),

  getMyPlans: () =>
    api.get<WorkoutPlanListResponse>("/workout-plans/assigned"),

  startWorkout: (id: string) =>
    api.post<Workout>(`/workout-plans/${id}/start`),

  getClientPlans: (username: string) =>
    api.get<WorkoutPlanListResponse>(`/clients/${username}/workout-plans`),
};
