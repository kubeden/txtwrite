"use client";

import { ThemeProvider as ThemeContextProvider } from "../contexts/ThemeContext.tsx";
import type { ReactNode } from "react";

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return <ThemeContextProvider>{children}</ThemeContextProvider>;
}
