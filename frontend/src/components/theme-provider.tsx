"use client";

import * as React from "react";

// ---------------------------------------------------------------------------
// Types (same surface as next-themes)
// ---------------------------------------------------------------------------

interface ValueObject {
  [themeName: string]: string;
}

type DataAttribute = `data-${string}`;
type Attribute = DataAttribute | "class";

interface UseThemeProps {
  themes: string[];
  forcedTheme?: string | undefined;
  setTheme: React.Dispatch<React.SetStateAction<string>>;
  theme?: string | undefined;
  resolvedTheme?: string | undefined;
  systemTheme?: "dark" | "light" | undefined;
}

interface ThemeProviderProps extends React.PropsWithChildren {
  themes?: string[] | undefined;
  forcedTheme?: string | undefined;
  enableSystem?: boolean | undefined;
  disableTransitionOnChange?: boolean | undefined;
  enableColorScheme?: boolean | undefined;
  storageKey?: string | undefined;
  defaultTheme?: string | undefined;
  attribute?: Attribute | Attribute[] | undefined;
  value?: ValueObject | undefined;
  nonce?: string;
  scriptProps?: React.DetailedHTMLProps<
    React.ScriptHTMLAttributes<HTMLScriptElement>,
    HTMLScriptElement
  >;
}


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SYSTEM_THEME_MEDIA = "(prefers-color-scheme: dark)";

function getSystemTheme(e?: MediaQueryList | MediaQueryListEvent): "dark" | "light" {
  const mql = e ?? window.matchMedia(SYSTEM_THEME_MEDIA);
  return mql.matches ? "dark" : "light";
}

function getThemeFromStorage(key: string, fallback: string): string {
  try {
    const stored = localStorage.getItem(key);
    return stored ?? fallback;
  } catch {
    return fallback;
  }
}

function setThemeInStorage(key: string, theme: string): void {
  try {
    localStorage.setItem(key, theme);
  } catch {
    // Ignore storage errors (private browsing etc.)
  }
}

function applyAttribute(
  attr: Attribute,
  theme: string,
  valueMap?: ValueObject,
  allThemeValues?: string[],
): void {
  const root = document.documentElement;
  const mapped = valueMap?.[theme] ?? theme;

  if (attr === "class") {
    if (allThemeValues) {
      const toRemove = allThemeValues.map((t) => valueMap?.[t] ?? t);
      root.classList.remove(...toRemove);
    }
    root.classList.add(mapped);
  } else if (attr.startsWith("data-")) {
    if (mapped) {
      root.setAttribute(attr, mapped);
    } else {
      root.removeAttribute(attr);
    }
  }
}

function applyTheme(
  attributes: Attribute[],
  theme: string,
  valueMap?: ValueObject,
  allThemes?: string[],
): void {
  attributes.forEach((attr) => applyAttribute(attr, theme, valueMap, allThemes));
}

function disableTransitions(nonce?: string): (() => void) | null {
  const css = document.createElement("style");
  if (nonce) css.setAttribute("nonce", nonce);
  css.appendChild(document.createTextNode("*{transition:none!important}"));
  document.head.appendChild(css);
  return () => {
    window.getComputedStyle(document.body);
    document.head.removeChild(css);
  };
}


// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ThemeContext = React.createContext<UseThemeProps | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ThemeProvider({
  children,
  themes: themesProp,
  forcedTheme,
  enableSystem = true,
  disableTransitionOnChange = false,
  enableColorScheme = true,
  storageKey = "theme",
  defaultTheme = enableSystem ? "system" : "light",
  attribute = "class",
  value,
  nonce,
}: ThemeProviderProps) {
  const allThemes = themesProp ?? ["light", "dark"];
  const attributes: Attribute[] = Array.isArray(attribute)
    ? attribute
    : [attribute];

  const [themeState, setThemeState] = React.useState<string>(() => {
    if (typeof window === "undefined") return defaultTheme;
    return getThemeFromStorage(storageKey, defaultTheme);
  });

  const [systemTheme, setSystemTheme] = React.useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "light";
    return getSystemTheme();
  });

  const resolvedTheme: string | undefined = forcedTheme
    ? forcedTheme
    : themeState === "system" && enableSystem
      ? systemTheme
      : themeState;

  const apply = React.useCallback(
    (currentTheme: string) => {
      if (typeof window === "undefined") return;
      const realTheme =
        currentTheme === "system" && enableSystem
          ? getSystemTheme()
          : currentTheme;

      const restoreTransitions = disableTransitionOnChange
        ? disableTransitions(nonce)
        : null;

      applyTheme(attributes, realTheme, value, allThemes);

      if (enableColorScheme) {
        document.documentElement.style.colorScheme = realTheme;
      }

      restoreTransitions?.();
    },
    [attributes, value, allThemes, enableSystem, disableTransitionOnChange, nonce, enableColorScheme],
  );

  // Listen for system theme changes
  React.useEffect(() => {
    const mql = window.matchMedia(SYSTEM_THEME_MEDIA);
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(getSystemTheme(e));
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Persist theme to storage
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    setThemeInStorage(storageKey, themeState);
  }, [themeState, storageKey]);

  // Apply theme when resolvedTheme changes
  React.useEffect(() => {
    if (resolvedTheme) apply(resolvedTheme);
  }, [resolvedTheme, apply]);

  // Listen for cross-tab storage changes
  React.useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        setThemeState(e.newValue);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [storageKey]);

  const setTheme: React.Dispatch<React.SetStateAction<string>> =
    React.useCallback(
      (action) => {
        setThemeState((prev) => {
          const next = typeof action === "function" ? action(prev) : action;
          return next;
        });
      },
      [],
    );

  const ctx: UseThemeProps = {
    themes: allThemes,
    forcedTheme,
    setTheme,
    theme: themeState,
    resolvedTheme,
    systemTheme,
  };

  return (
    <ThemeContext.Provider value={ctx}>{children}</ThemeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTheme(): UseThemeProps {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error(
      "useTheme must be used within a ThemeProvider. " +
        "Wrap your application with <ThemeProvider> from @/components/theme-provider.",
    );
  }
  return ctx;
}
