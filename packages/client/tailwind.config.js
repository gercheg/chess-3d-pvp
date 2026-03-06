/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        chess: {
          bg: "#0F0F23",
          primary: "#7C3AED",
          secondary: "#A78BFA",
          cta: "#F43F5E",
          text: "#E2E8F0",
          muted: "#94A3B8",
          surface: "#1A1A2E",
          border: "#2D2D44",
          "surface-hover": "#252542",
        },
      },
      fontFamily: {
        heading: ["Russo One", "sans-serif"],
        body: ["Chakra Petch", "sans-serif"],
      },
      boxShadow: {
        neon: "0 0 20px rgba(124,58,237,0.3)",
        "neon-strong": "0 0 30px rgba(124,58,237,0.5)",
        "neon-cta": "0 0 20px rgba(244,63,94,0.3)",
        "neon-green": "0 0 15px rgba(34,197,94,0.3)",
      },
      animation: {
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
      },
      keyframes: {
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 15px rgba(124,58,237,0.2)" },
          "50%": { boxShadow: "0 0 30px rgba(124,58,237,0.5)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
