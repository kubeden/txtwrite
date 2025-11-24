// src/components/modals/WelcomeModal.js

'use client';

import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';

const WelcomeModal = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [animateOut, setAnimateOut] = useState(false);

    useEffect(() => {
        // Check if the welcome modal has been shown before
        const hasShownWelcomeModal = localStorage.getItem('hasShownWelcomeModal');

        if (!hasShownWelcomeModal) {
            // If not shown, set modal to visible
            setIsVisible(true);

            // Add a small delay before showing for a smooth page load experience
            const timer = setTimeout(() => {
                document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
            }, 100);

            return () => clearTimeout(timer);
        }
    }, []);

    const closeModal = () => {
        // Start exit animation
        setAnimateOut(true);

        // Mark as shown in localStorage
        localStorage.setItem('hasShownWelcomeModal', 'true');

        // Enable scrolling again
        document.body.style.overflow = '';

        // Actually remove the component after animation completes
        setTimeout(() => {
            setIsVisible(false);
        }, 300); // Match animation duration
    };

    if (!isVisible) return null;

    return (
        <div
            className={`fixed inset-0 flex items-center justify-center bg-brand-dark bg-opacity-100 transition-all duration-300 ${animateOut ? 'opacity-0' : 'opacity-100'}`}
            style={{
                background: "rgba( 255, 255, 255, 0.7 )",
                backdropFilter: "blur( 3.5px )",
                zIndex: "99994934"
            }}>
            <div
                className={`relative border border-neutral-800 bg-neutral-900 w-full h-full overflow-hidden transition-all duration-300 transform ${animateOut ? 'scale-95 opacity-80' : 'scale-100'}`}
            >
                <div className="flex flex-col items-center justify-center h-full px-8 py-8 w-full">
                    {/* Centered content with graphic */}
                    <div className="text-start max-w-full">
                        {/* Graphic element */}
                        <div className="mb-8 flex justify-start">
                            <button
                                onClick={closeModal}
                                className="px-8 py-4 text-neutral-700 text-xl font-medium rounded-lg flex items-center relative cursor-pointer hover:text-neutral-500"
                            >
                                <span>start writing</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </button>
                        </div>
                        {/* <div className="absolute top-6 left-6 opacity-10">
                            <img src="/logo/logo-dark.png" className="w-20 h-20 rounded-md border border-neutral-800" />
                        </div> */}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WelcomeModal;