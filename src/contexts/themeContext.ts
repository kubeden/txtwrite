import { createContext, useContext } from "react";

export type Theme = "light" | "dark";

export interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: Theme;
  setTheme: (value: Theme) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined,
);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
