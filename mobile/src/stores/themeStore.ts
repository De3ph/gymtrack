import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ThemeSetting = "system" | "light" | "dark";

interface ThemeState {
  theme: ThemeSetting;
  setTheme: (theme: ThemeSetting) => void;
}

const isThemeSetting = (value: unknown): value is ThemeSetting =>
  value === "system" || value === "light" || value === "dark";

const secureStoreStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "gymtrack-theme",
      storage: createJSONStorage(() => secureStoreStorage),
      // invalidate shapes like { theme: null } rehydrated from older versions
      merge: (persisted, current) => ({
        ...current,
        theme: isThemeSetting((persisted as Partial<ThemeState>)?.theme)
          ? (persisted as Partial<ThemeState>).theme!
          : "system",
      }),
    },
  ),
);
