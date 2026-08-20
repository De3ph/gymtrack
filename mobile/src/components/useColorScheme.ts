import { useColorScheme as useColorSchemeCore } from "react-native";

import type { ColorScheme } from "@/constants/Colors";

export const useColorScheme = (): ColorScheme => {
  const coreScheme = useColorSchemeCore();
  return coreScheme === "dark" ? "dark" : "light";
};
