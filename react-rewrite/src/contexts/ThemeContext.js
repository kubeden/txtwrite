'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(undefined);

const getInitialTheme = () => {
    if (typeof window === 'undefined') {
        return 'dark';
    }

    const storedTheme = window.localStorage.getItem('theme');
    if (storedTheme) {
        return storedTheme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(getInitialTheme);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const root = window.document.documentElement;
        root.classList.toggle('dark', theme === 'dark');
        window.localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handlePreferenceChange = (event) => {
            const storedTheme = window.localStorage.getItem('theme');
            if (!storedTheme) {
                setThemeState(event.matches ? 'dark' : 'light');
            }
        };

        mediaQuery.addEventListener('change', handlePreferenceChange);
        return () => mediaQuery.removeEventListener('change', handlePreferenceChange);
    }, []);

    const toggleTheme = () => {
        setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
    };

    const setTheme = (value) => setThemeState(value);

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme: theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
