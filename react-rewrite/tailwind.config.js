/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: 'selector',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                // You can customize the color palette here if needed
                secondary: '#1b1b1b',
                black: '#ffffff'
            },
            animation: {
                // Add specific animations for mobile transitions
                animation: {
                    'fade-in': 'fadeIn 0.3s ease forwards',
                    'fade-out': 'fadeOut 0.3s ease forwards',
                },
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeOut: {
                    '0%': { opacity: '1', transform: 'translateY(0)' },
                    '100%': { opacity: '0', transform: 'translateY(10px)' },
                },
            },
            typography: {
                DEFAULT: {
                    css: {
                        maxWidth: '65ch',
                        color: 'var(--foreground-rgb)',
                        p: {
                            marginTop: '1.25em',
                            marginBottom: '1.25em',
                        },
                    },
                },
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
};
