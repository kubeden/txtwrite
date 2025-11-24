"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext.tsx";

export default function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const darkMode = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center justify-center p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer rounded-md"
      aria-label="Toggle theme"
    >
      {darkMode
        ? <Sun size={18} className="text-neutral-200 dark:text-neutral-600" />
        : <Moon size={18} className="text-neutral-400 dark:text-neutral-600" />}
    </button>
  );
}
