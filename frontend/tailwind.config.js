/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // GreenGrid brand — use green ONLY as accent, never as background
        brand: {
          green:     "#22c55e",   // primary accent (buttons, borders, active nav)
          dark:      "#15803d",   // darker variant (hover states)
          muted:     "#16a34a",   // mid-tone (icons, sub-labels)
          subtle:    "#14532d",   // very dark (light fills, highlights)
          glow:      "#22c55e33", // transparent glow for cards
        },
        // Dark navy/charcoal surface scale
        surface: {
          950: "#060d1b",
          900: "#0a1628",
          800: "#0f2040",
          750: "#132648",
          700: "#1e3354",
          600: "#2c4463",
          500: "#435870",
          400: "#6b80a0",
          300: "#8fa3be",
        },
        // Neutral text / divider scale
        slate: {
          50:  "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        "brand-glow": "0 0 20px rgba(34,197,94,0.15)",
        "card":       "0 4px 24px rgba(0,0,0,0.4)",
      },
    },
  },
  plugins: [],
};
