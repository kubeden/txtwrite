'use client';

import React, { useEffect, useState } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';

export default function ClientThemeProvider({ children }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div style={{ visibility: 'hidden' }}>
                {children}
            </div>
        );
    }

    return <ThemeProvider>{children}</ThemeProvider>;
}
