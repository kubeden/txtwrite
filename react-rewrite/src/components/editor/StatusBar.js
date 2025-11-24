'use client';

import { useState, useEffect } from 'react';
import ThemeToggle from '../ui/ThemeToggle';

export default function StatusBar({ markdownText, editStatus, getCaretPosition, getLineAndColumn }) {
    // Get line and column position
    const { line, column } = getLineAndColumn ? getLineAndColumn() : { line: 1, column: 1 };
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile screen size
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        // Initial check
        checkMobile();

        // Add listener for window resize
        window.addEventListener('resize', checkMobile);

        // Clean up
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Mobile StatusBar component
    const MobileStatusBar = () => (
        <div className="w-full bg-neutral-100 dark:bg-neutral-900 px-2 text-neutral-800 dark:text-neutral-700 text-xs py-1">
            {/* <div className="flex flex-row items-center justify-between h-full">
                <div className="flex items-center">
                    <span>
                        <span className="text-neutral-700 dark:text-neutral-600">{markdownText.split(/\s+/).filter(Boolean).length}</span> Words
                    </span>
                </div>
                <div className="flex items-center justify-center">
                    <div className="flex items-center justify-center">
                        <span className={`w-1.5 h-1.5 rounded-full ${editStatus === 'editing' ? 'bg-amber-500' : 'bg-green-500'}`}>
                        </span>
                    </div>
                </div>
            </div> */}
        </div>
    );

    // Desktop StatusBar component
    const DesktopStatusBar = () => (
        <div className="w-full bg-neutral-100 dark:bg-neutral-900 ps-4 pe-1 text-neutral-800 dark:text-neutral-700 text-sm py-1 border-t border-neutral-200 dark:border-neutral-800">
            <div className="flex flex-row items-center justify-between h-full">
                <div className="flex items-center gap-x-2">
                    <span><span className="text-neutral-700 dark:text-neutral-600">{markdownText.length}</span> Characters</span>
                    <span>/</span>
                    <span><span className="text-neutral-700 dark:text-neutral-600">{markdownText.split(/\s+/).filter(Boolean).length}</span> Words</span>
                    <span>/</span>
                    <span>
                        LN
                    </span>
                    <span className="text-neutral-700 dark:text-neutral-600">
                        {line}
                    </span>
                    <span>
                        COL
                    </span>
                    <span className="text-neutral-700 dark:text-neutral-600">
                        {column}
                    </span>
                </div>
                <div className="pe-2 flex flex-row items-center justify-center">
                    <div className="flex flex-row items-center justify-center gap-x-2">
                        <span className={`w-1.5 h-1.5 mt-0.5 rounded-full ${editStatus === 'editing' ? 'bg-amber-500' : 'bg-green-500'}`}>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );

    // Render the appropriate component based on screen size
    return isMobile ? <MobileStatusBar /> : <DesktopStatusBar />;
}