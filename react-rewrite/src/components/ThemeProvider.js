'use client';

import { ThemeProvider as ThemeContextProvider } from '@/contexts/ThemeContext';

export function ThemeProvider({ children }) {
  return <ThemeContextProvider>{children}</ThemeContextProvider>;
}
