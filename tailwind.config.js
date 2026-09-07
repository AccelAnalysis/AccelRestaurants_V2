/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#111827", // neutral-900
        surface: "#1F2937",    // neutral-800
        "surface-highlight": "#374155", // neutral-700
        primary: "var(--primary-color, #EA580C)",    // Dynamic Primary Color
        "primary-hover": "var(--primary-color-hover, #DC2626)", // Dynamic Hover (or fallback)
        text: "#F9FAFB",       // neutral-50
        "text-secondary": "#D1D5DB", // neutral-300
        "text-muted": "#9CA3AF", // neutral-400
        success: "#10B981",    // emerald-500
        warning: "#F59E0B",    // amber-500
        error: "#EF4444",      // red-500
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
