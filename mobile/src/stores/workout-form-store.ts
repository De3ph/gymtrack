import { create } from "zustand";
import type { Workout, WorkoutPlan } from "@/types";
import { todayString } from "@/lib/dates";

export interface NewSet {
  id: string;
  reps: string;
  weight: string;
}

export interface NewExercise {
  id: string;
  name: string;
  notes: string;
  pickedExerciseId?: number;
  sets: NewSet[];
}

let exerciseCounter = 0;
let setCounter = 0;

function nextExerciseId(): string {
  exerciseCounter += 1;
  return "ex-" + String(exerciseCounter);
}

function nextSetId(): string {
  setCounter += 1;
  return "set-" + String(setCounter);
}

export function createEmptySet(): NewSet {
  return { id: nextSetId(), reps: "", weight: "" };
}

export function createEmptyExercise(): NewExercise {
  return {
    id: nextExerciseId(),
    name: "",
    notes: "",
    sets: [createEmptySet()],
  };
}

function workoutToExercises(workout: Workout): NewExercise[] {
  return (workout.exercises ?? []).map((ex) => ({
    id: nextExerciseId(),
    name: ex.name ?? "",
    notes: ex.notes ?? "",
    sets: (ex.sets ?? []).map((s) => ({
      id: nextSetId(),
      reps: String(s.reps ?? ""),
      weight: String(s.weight ?? ""),
    })),
  }));
}

function resetExerciseAndSetCounters() {
  exerciseCounter = 0;
  setCounter = 0;
}

function planToExercises(plan: WorkoutPlan): NewExercise[] {
  return (plan.exercises ?? []).map((ex) => ({
    id: nextExerciseId(),
    name: ex.name ?? "",
    notes: ex.notes ?? "",
    pickedExerciseId: ex.exerciseId > 0 ? ex.exerciseId : undefined,
    sets:
      ex.sets && ex.sets.length > 0
        ? ex.sets.map((s) => ({
            id: nextSetId(),
            reps: s.reps ? String(s.reps) : "",
            weight: s.weight ? String(s.weight) : "",
          }))
        : [createEmptySet()],
  }));
}

interface WorkoutFormState {
  editingWorkout: Workout | null;
  newDate: string;
  newExercises: NewExercise[];
  submitError: string | null;
  pickerVisible: boolean;
  pickingForExId: string | null;

  startCreate: () => void;
  startFromPlan: (plan: WorkoutPlan) => void;
  startEdit: (workout: Workout) => void;
  resetForm: () => void;
  setNewDate: (date: string) => void;
  setSubmitError: (error: string | null) => void;
  openPickerFor: (exId: string) => void;
  setPickerVisible: (visible: boolean) => void;
  handleExerciseSelect: (exercise: {
    name: string;
    exerciseId: number;
    category?: string;
  }) => void;
  updateExerciseName: (exId: string, name: string) => void;
  updateExerciseNotes: (exId: string, notes: string) => void;
  updateExercisePickedId: (exId: string, pickedExerciseId: number) => void;
  addExercise: () => void;
  addPickedExercise: (name: string, pickedExerciseId: number) => void;
  removeExercise: (exId: string) => void;
  addSet: (exId: string) => void;
  removeSet: (exId: string, setId: string) => void;
  updateSetReps: (exId: string, setId: string, reps: string) => void;
  updateSetWeight: (exId: string, setId: string, weight: string) => void;
}

export const useWorkoutFormStore = create<WorkoutFormState>((set, get) => ({
  editingWorkout: null,
  newDate: todayString(),
  newExercises: [createEmptyExercise()],
  submitError: null,
  pickerVisible: false,
  pickingForExId: null,

  startCreate: () => {
    resetExerciseAndSetCounters();
    set({
      editingWorkout: null,
      newDate: todayString(),
      newExercises: [createEmptyExercise()],
      submitError: null,
    });
  },

  startFromPlan: (plan) => {
    resetExerciseAndSetCounters();
    const exercises = planToExercises(plan);
    set({
      editingWorkout: null,
      newDate: todayString(),
      newExercises: exercises.length > 0 ? exercises : [createEmptyExercise()],
      submitError: null,
    });
  },

  startEdit: (workout) => {
    set({
      editingWorkout: workout,
      newDate: workout.date,
      newExercises: workoutToExercises(workout),
      submitError: null,
    });
  },

  resetForm: () => {
    set({
      editingWorkout: null,
      newDate: todayString(),
      newExercises: [createEmptyExercise()],
      submitError: null,
    });
  },

  setNewDate: (date) => set({ newDate: date }),

  setSubmitError: (error) => set({ submitError: error }),

  openPickerFor: (exId) => {
    set({ pickingForExId: exId, pickerVisible: true });
  },

  setPickerVisible: (visible) => set({ pickerVisible: visible }),

  handleExerciseSelect: (exercise) => {
    const { pickingForExId } = get();
    if (pickingForExId) {
      get().updateExerciseName(pickingForExId, exercise.name);
      if (exercise.exerciseId != null) {
        get().updateExercisePickedId(pickingForExId, exercise.exerciseId);
      }
    }
  },

  updateExerciseName: (exId, name) => {
    set((state) => ({
      newExercises: state.newExercises.map((ex) =>
        ex.id === exId ? { ...ex, name } : ex
      ),
    }));
  },

  updateExerciseNotes: (exId, notes) => {
    set((state) => ({
      newExercises: state.newExercises.map((ex) =>
        ex.id === exId ? { ...ex, notes } : ex
      ),
    }));
  },

  updateExercisePickedId: (exId, pickedExerciseId) => {
    set((state) => ({
      newExercises: state.newExercises.map((ex) =>
        ex.id === exId ? { ...ex, pickedExerciseId } : ex
      ),
    }));
  },

  addExercise: () => {
    set((state) => ({
      newExercises: [...state.newExercises, createEmptyExercise()],
    }));
  },

  addPickedExercise: (name, pickedExerciseId) => {
    set((state) => ({
      newExercises: [
        ...state.newExercises,
        { ...createEmptyExercise(), name, pickedExerciseId },
      ],
    }));
  },

  removeExercise: (exId) => {
    const { pickingForExId } = get();
    set((state) => ({
      newExercises: state.newExercises.filter((ex) => ex.id !== exId),
      pickingForExId: pickingForExId === exId ? null : pickingForExId,
    }));
  },

  addSet: (exId) => {
    set((state) => ({
      newExercises: state.newExercises.map((ex) =>
        ex.id === exId ? { ...ex, sets: [...ex.sets, createEmptySet()] } : ex
      ),
    }));
  },

  removeSet: (exId, setId) => {
    set((state) => ({
      newExercises: state.newExercises.map((ex) =>
        ex.id === exId
          ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) }
          : ex
      ),
    }));
  },

  updateSetReps: (exId, setId, reps) => {
    set((state) => ({
      newExercises: state.newExercises.map((ex) =>
        ex.id === exId
          ? {
              ...ex,
              sets: ex.sets.map((s) => (s.id === setId ? { ...s, reps } : s)),
            }
          : ex
      ),
    }));
  },

  updateSetWeight: (exId, setId, weight) => {
    set((state) => ({
      newExercises: state.newExercises.map((ex) =>
        ex.id === exId
          ? {
              ...ex,
              sets: ex.sets.map((s) =>
                s.id === setId ? { ...s, weight } : s
              ),
            }
          : ex
      ),
    }));
  },
}));
