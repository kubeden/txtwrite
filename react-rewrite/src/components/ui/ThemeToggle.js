'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
    const [darkMode, setDarkMode] = useState(false);

    // On component mount, check localStorage
    useEffect(() => {
        // Check localStorage first
        const savedTheme = localStorage.getItem('theme');

        // If theme is stored in localStorage, use that
        if (savedTheme) {
            const isDarkMode = savedTheme === 'dark';
            setDarkMode(isDarkMode);
            document.documentElement.classList.toggle('dark', isDarkMode);
        }
        // Otherwise check system preference
        else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setDarkMode(prefersDark);
            document.documentElement.classList.toggle('dark', prefersDark);
            localStorage.setItem('theme', prefersDark ? 'dark' : 'light');
        }
    }, []);

    const toggleTheme = () => {
        const newDarkMode = !darkMode;
        setDarkMode(newDarkMode);

        // Update localStorage
        localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');

        // Toggle the dark class on the html element
        document.documentElement.classList.toggle('dark', newDarkMode);
    };

    return (
        <button
            onClick={toggleTheme}
            className="flex items-center justify-center p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer rounded-md"
            aria-label="Toggle theme"
        >
            {darkMode ? (
                <Sun size={18} className="text-neutral-200 dark:text-neutral-600" />
            ) : (
                <Moon size={18} className="text-neutral-400 dark:text-neutral-600" />
            )}
        </button>
    );
}