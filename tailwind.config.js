/** @type {import('tailwindcss').Config} */
import typography from "@tailwindcss/typography";

export default {
  content: [
    "./index.html",
    "./public/**/*.{html,js,ts,jsx,tsx,mdx}",
    "./src/**/*",
    "./**/*.{js,ts,jsx,tsx,mdx,css,html}",
  ],
  // Keep all utilities (including responsive/state variants) so dynamic classNames don't get purged
  safelist: [
    {
      pattern: /.+/,
      variants: [
        "sm",
        "md",
        "lg",
        "xl",
        "2xl",
        "hover",
        "focus",
        "active",
        "focus-visible",
        "disabled",
        "dark",
        "group-hover",
        "group-focus",
        "group-active",
      ],
    },
  ],
  darkMode: "selector",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        // You can customize the color palette here if needed
        secondary: "#1b1b1b",
        black: "#ffffff",
      },
      animation: {
        // Add specific animations for mobile transitions
        animation: {
          "fade-in": "fadeIn 0.3s ease forwards",
          "fade-out": "fadeOut 0.3s ease forwards",
        },
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeOut: {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(10px)" },
        },
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "65ch",
            color: "var(--foreground-rgb)",
            p: {
              marginTop: "1.25em",
              marginBottom: "1.25em",
            },
          },
        },
      },
    },
  },
  plugins: [
    typography,
  ],
};
