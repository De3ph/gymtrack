import { create } from "zustand";

export type RegisterRole = "athlete" | "trainer";

interface RegisterFormState {
  role: RegisterRole;
  username: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  age: string;
  weight: string;
  height: string;
  fitnessGoals: string;
  certifications: string;
  specializations: string;
  error: string;

  setRole: (role: RegisterRole) => void;
  setUsername: (username: string) => void;
  setName: (name: string) => void;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setConfirmPassword: (confirmPassword: string) => void;
  setAge: (age: string) => void;
  setWeight: (weight: string) => void;
  setHeight: (height: string) => void;
  setFitnessGoals: (fitnessGoals: string) => void;
  setCertifications: (certifications: string) => void;
  setSpecializations: (specializations: string) => void;
  setError: (error: string) => void;
  resetForm: () => void;
}

const initialFormState = {
  role: "athlete" as RegisterRole,
  username: "",
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  age: "",
  weight: "",
  height: "",
  fitnessGoals: "",
  certifications: "",
  specializations: "",
  error: "",
};

export const useRegisterFormStore = create<RegisterFormState>((set) => ({
  ...initialFormState,

  setRole: (role) => set({ role }),
  setUsername: (username) => set({ username }),
  setName: (name) => set({ name }),
  setEmail: (email) => set({ email }),
  setPassword: (password) => set({ password }),
  setConfirmPassword: (confirmPassword) => set({ confirmPassword }),
  setAge: (age) => set({ age }),
  setWeight: (weight) => set({ weight }),
  setHeight: (height) => set({ height }),
  setFitnessGoals: (fitnessGoals) => set({ fitnessGoals }),
  setCertifications: (certifications) => set({ certifications }),
  setSpecializations: (specializations) => set({ specializations }),
  setError: (error) => set({ error }),

  resetForm: () => set({ ...initialFormState }),
}));
