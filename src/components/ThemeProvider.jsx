'use client';

import { ThemeProvider as ThemeContextProvider } from '../contexts/ThemeContext.jsx';

export function ThemeProvider({ children }) {
  return <ThemeContextProvider>{children}</ThemeContextProvider>;
}
